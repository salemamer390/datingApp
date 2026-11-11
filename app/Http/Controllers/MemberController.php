<?php

namespace App\Http\Controllers;

use App\Models\Block;
use App\Models\Favorite;
use App\Models\Feed;
use App\Models\Like;
use App\Models\ProfileView;
use App\Models\Report;
use App\Models\User;
use App\Support\Lc;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    private function flags(int $me, array $ids): array
    {
        return [
            'liked' => Like::where('user_id', $me)->whereIn('target_id', $ids)->pluck('target_id')->flip()->all(),
            'fav' => Favorite::where('user_id', $me)->whereIn('target_id', $ids)->pluck('target_id')->flip()->all(),
        ];
    }

    private function shape(User $u, array $f): array
    {
        return $u->card() + ['liked' => isset($f['liked'][$u->id]), 'favorite' => isset($f['fav'][$u->id])];
    }

    public function index(Request $r)
    {
        $me = $r->user();
        $q = User::query()->where('id', '!=', $me->id)->whereNotIn('id', Lc::hiddenIds($me->id))
            ->whereNotNull('gender')->whereNotNull('age')->whereNotNull('onboarding_completed_at');
        // Members who turned off "Show my profile in discovery" are excluded.
        $q->where(fn ($w) => $w->whereNull('settings')->orWhere(fn ($x) => $x->where('settings', 'not like', '%"privacy1":false%')->where('settings', 'not like', '%"privacy1": false%')));

        $tab = $r->query('tab', 'all');
        if ($tab === 'online') { $q->where(fn ($w) => $w->where('last_seen_at', '>', now()->subMinutes(5))->orWhere(fn ($x) => $x->where('is_demo', true)->whereRaw('id % 4 != 0'))); }
        if ($tab === 'new') { $q->where('created_at', '>', now()->subDays(14)); }
        if (in_array($tab, ['serious', 'friendship'], true)) { $q->where('goal', $tab); }

        if ($r->boolean('filtered')) {
            $q->whereBetween('age', [(int) $r->query('min', 18), (int) $r->query('max', 100)]);
            if (($g = $r->query('gender', 'all')) !== 'all') { $q->where('gender', $g); }
            if (($g = $r->query('goal', 'all')) !== 'all') { $q->where('goal', $g); }
            if (($c = strtolower($r->query('country', 'all'))) !== 'all') {
                $q->where(fn ($w) => $w->whereRaw('lower(country) = ?', [$c])->orWhereRaw('lower(region) = ?', [$c]));
            }
            if (($c = strtolower($r->query('city', 'all'))) !== 'all') { $q->whereRaw('lower(city) like ?', ['%' . $c . '%']); }
            if (($i = strtolower($r->query('interest', 'all'))) !== 'all') { $q->whereRaw('lower(interests) like ?', ['%' . $i . '%']); }
            $a = $r->query('activity', 'all');
            if ($a === 'online') { $q->where(fn ($w) => $w->where('last_seen_at', '>', now()->subMinutes(5))->orWhere(fn ($x) => $x->where('is_demo', true)->whereRaw('id % 4 != 0'))); }
            if ($a === 'new') { $q->where('created_at', '>', now()->subDays(14)); }
        }
        $page = $q->orderBy('id')->paginate(24)->withQueryString();
        $f = $this->flags($me->id, $page->pluck('id')->all());
        return [
            'data' => $page->getCollection()->map(fn ($u) => $this->shape($u, $f))->values(),
            'total' => $page->total(), 'page' => $page->currentPage(), 'pages' => $page->lastPage(), 'per_page' => 24,
        ];
    }

    public function show(Request $r, User $user)
    {
        $me = $r->user();
        abort_if($user->id !== $me->id && ! $user->hasCompletedOnboarding(), 404);
        if (in_array($user->id, Lc::hiddenIds($me->id), true)) { abort(404); }
        if ($user->id !== $me->id) {
            $v = ProfileView::firstOrNew(['viewer_id' => $me->id, 'viewed_id' => $user->id]);
            $isNew = ! $v->exists;
            $v->updated_at = now();
            $v->save();
            if ($isNew) { $this->notify($user, $me, 'view', "{$me->name} viewed your profile", 'See who has been looking.', '/profile-views.html', 'notify4'); }
        }
        $f = $this->flags($me->id, [$user->id]);
        $match = Like::where('user_id', $user->id)->where('target_id', $me->id)->exists() && isset($f['liked'][$user->id]);
        return ['member' => $this->shape($user, $f) + ['match' => $match, 'photos' => $user->photos->map(fn ($p) => $p->url())->values()]];
    }

    private function notify(User $to, User $actor, string $type, string $title, string $body, string $href, ?string $pref = null): void
    {
        if ($pref && ($to->settings[$pref] ?? true) === false) { return; }
        Feed::create(['user_id' => $to->id, 'actor_id' => $actor->id, 'type' => $type, 'title' => $title, 'body' => $body, 'href' => $href]);
    }

    private function guardTarget(Request $r, User $user): void
    {
        abort_if($user->id === $r->user()->id, 422, 'You cannot do that to yourself.');
        abort_if(in_array($user->id, Lc::hiddenIds($r->user()->id), true), 404);
    }

    public function like(Request $r, User $user)
    {
        $this->guardTarget($r, $user);
        $me = $r->user();
        $existing = Like::where('user_id', $me->id)->where('target_id', $user->id)->first();
        if ($existing) {
            $existing->delete();
            return ['liked' => false, 'match' => false];
        }
        Like::create(['user_id' => $me->id, 'target_id' => $user->id]);
        $match = Like::where('user_id', $user->id)->where('target_id', $me->id)->exists();
        $this->notify($user, $me, 'like', "{$me->name} liked your profile", 'Visit Likes to see the connection.', '/likes.html', 'notify2');
        if ($match) {
            $this->notify($user, $me, 'match', 'You have a new match!', "You and {$me->name} liked each other. Say hello.", '/chat.html?person=' . rawurlencode($me->name) . '&with=' . $me->id, 'notify5');
            $this->notify($me, $user, 'match', 'You have a new match!', "You and {$user->name} liked each other. Say hello.", '/chat.html?person=' . rawurlencode($user->name) . '&with=' . $user->id, 'notify5');
        }
        return ['liked' => true, 'match' => $match];
    }

    public function favorite(Request $r, User $user)
    {
        $this->guardTarget($r, $user);
        $me = $r->user();
        $existing = Favorite::where('user_id', $me->id)->where('target_id', $user->id)->first();
        if ($existing) { $existing->delete(); return ['favorite' => false]; }
        Favorite::create(['user_id' => $me->id, 'target_id' => $user->id]);
        $this->notify($user, $me, 'favorite', "{$me->name} added you to favorites", 'See who saved your profile.', '/favorites.html', 'notify3');
        return ['favorite' => true];
    }

    public function block(Request $r, User $user)
    {
        abort_if($user->id === $r->user()->id, 422);
        $me = $r->user();
        Block::firstOrCreate(['user_id' => $me->id, 'target_id' => $user->id]);
        Like::where(fn ($w) => $w->where('user_id', $me->id)->where('target_id', $user->id))
            ->orWhere(fn ($w) => $w->where('user_id', $user->id)->where('target_id', $me->id))->delete();
        Favorite::where('user_id', $me->id)->where('target_id', $user->id)->delete();
        return ['blocked' => true];
    }

    public function unblock(Request $r, User $user)
    {
        Block::where('user_id', $r->user()->id)->where('target_id', $user->id)->delete();
        return ['blocked' => false];
    }

    public function report(Request $r, User $user)
    {
        $d = $r->validate(['reason' => 'nullable|string|max:500']);
        abort_if($user->id === $r->user()->id, 422);
        Report::create(['reporter_id' => $r->user()->id, 'target_id' => $user->id, 'reason' => $d['reason'] ?? null]);
        return ['reported' => true];
    }
}
