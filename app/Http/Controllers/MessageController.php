<?php

namespace App\Http\Controllers;

use App\Models\ConversationTrash;
use App\Models\Favorite;
use App\Models\Feed;
use App\Models\Like;
use App\Models\Message;
use App\Models\User;
use App\Support\Lc;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function conversations(Request $r)
    {
        $me = $r->user()->id;
        $hidden = Lc::hiddenIds($me);
        $trashed = ConversationTrash::where('user_id', $me)->pluck('member_id')->flip();
        $wantTrash = $r->boolean('trash');
        $msgs = Message::where(fn ($w) => $w->where('sender_id', $me)->orWhere('recipient_id', $me))
            ->orderByDesc('id')->limit(2000)->get();
        $threads = [];
        foreach ($msgs as $m) {
            $other = $m->sender_id === $me ? $m->recipient_id : $m->sender_id;
            if (in_array($other, $hidden, true)) { continue; }
            if (isset($trashed[$other]) !== $wantTrash) { continue; }
            $threads[$other] ??= ['last' => $m, 'unread' => 0, 'inbound' => false];
            if ($m->recipient_id === $me) { $threads[$other]['inbound'] = true; }
            if ($m->recipient_id === $me && ! $m->read_at) { $threads[$other]['unread']++; }
        }
        $users = User::whereIn('id', array_keys($threads))->get()->keyBy('id');
        $fav = Favorite::where('user_id', $me)->pluck('target_id')->flip();
        $out = [];
        foreach ($threads as $id => $t) {
            if (! isset($users[$id])) { continue; }
            $out[] = ['member' => $users[$id]->card(), 'last' => $t['last']->body, 'at' => $t['last']->created_at,
                'mine' => $t['last']->sender_id === $me, 'inbound' => $t['inbound'], 'unread' => $t['unread'],
                'favorite' => isset($fav[$id]), 'trashed' => $wantTrash];
        }
        return ['conversations' => $out, 'unread' => $wantTrash ? 0 : collect($out)->sum('unread')];
    }

    public function trash(Request $r, User $user)
    {
        abort_if($user->id === $r->user()->id, 422);
        ConversationTrash::firstOrCreate(['user_id' => $r->user()->id, 'member_id' => $user->id]);
        return ['trashed' => true];
    }

    public function restore(Request $r, User $user)
    {
        ConversationTrash::where('user_id', $r->user()->id)->where('member_id', $user->id)->delete();
        return ['trashed' => false];
    }

    public function thread(Request $r, User $user)
    {
        $me = $r->user()->id;
        abort_if(in_array($user->id, Lc::hiddenIds($me), true), 404);
        Message::where('sender_id', $user->id)->where('recipient_id', $me)->whereNull('read_at')->update(['read_at' => now()]);
        $rows = Message::where(fn ($w) => $w->where('sender_id', $me)->where('recipient_id', $user->id))
            ->orWhere(fn ($w) => $w->where('sender_id', $user->id)->where('recipient_id', $me))
            ->orderByDesc('id')->limit(200)->get()->reverse()->values();
        return ['member' => $user->card() + [
            'liked' => Like::where('user_id', $me)->where('target_id', $user->id)->exists(),
            'favorite' => Favorite::where('user_id', $me)->where('target_id', $user->id)->exists(),
            'trashed' => ConversationTrash::where('user_id', $me)->where('member_id', $user->id)->exists(),
        ], 'messages' => $rows->map(fn ($m) => [
            'id' => $m->id, 'mine' => $m->sender_id === $me, 'body' => $m->body, 'at' => $m->created_at, 'read' => (bool) $m->read_at,
        ])];
    }

    /**
     * "Allow messages from everyone" (privacy4). When the recipient has it off, only people the recipient
     * has liked, or has already written to, may message them. Blocks are checked separately by the caller.
     */
    private function mayMessage(User $sender, User $recipient): bool
    {
        if (($recipient->settings['privacy4'] ?? false) === true) {
            return true;
        }
        return Like::where('user_id', $recipient->id)->where('target_id', $sender->id)->exists()
            || Message::where('sender_id', $recipient->id)->where('recipient_id', $sender->id)->exists();
    }

    public function send(Request $r, User $user)
    {
        $d = $r->validate(['body' => 'required|string|max:1000']);
        $me = $r->user();
        abort_if($user->id === $me->id, 422, 'You cannot message yourself.');
        abort_if(in_array($user->id, Lc::hiddenIds($me->id), true), 404);
        abort_unless($this->mayMessage($me, $user), 403, 'This member only accepts messages from people they have liked or already written to.');
        $body = trim($d['body']);
        abort_if($body === '', 422);
        $m = Message::create(['sender_id' => $me->id, 'recipient_id' => $user->id, 'body' => $body]);
        // A new message brings the conversation back out of Trash for both members.
        ConversationTrash::where(fn ($w) => $w->where('user_id', $me->id)->where('member_id', $user->id))
            ->orWhere(fn ($w) => $w->where('user_id', $user->id)->where('member_id', $me->id))->delete();
        if (($user->settings['notify1'] ?? true) !== false) {
            // One unread "new message" notification per sender, refreshed rather than duplicated.
            Feed::where('user_id', $user->id)->where('actor_id', $me->id)->where('type', 'message')->whereNull('read_at')->delete();
            Feed::create(['user_id' => $user->id, 'actor_id' => $me->id, 'type' => 'message', 'title' => "New message from {$me->name}",
                'body' => '“' . mb_strimwidth($body, 0, 80, '…') . '”', 'href' => '/chat.html?person=' . rawurlencode($me->name) . '&with=' . $me->id]);
        }
        return ['id' => $m->id, 'at' => $m->created_at];
    }
}
