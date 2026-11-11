<?php

namespace App\Http\Controllers;

use App\Models\Feed;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $r)
    {
        $hideSafety = ($r->user()->settings['notifySafety'] ?? true) === false;
        $rows = Feed::where('user_id', $r->user()->id)
            ->when($hideSafety, fn ($q) => $q->where('type', '!=', 'safety'))
            ->orderByDesc('id')->limit(50)->get();
        return ['notifications' => $rows->map(fn ($n) => [
            'id' => $n->id, 'type' => $n->type, 'title' => $n->title, 'body' => $n->body, 'href' => $n->href,
            'at' => $n->created_at, 'unread' => $n->read_at === null,
        ]), 'unread' => $rows->whereNull('read_at')->count()];
    }

    public function read(Request $r, int $id)
    {
        Feed::where('user_id', $r->user()->id)->where('id', $id)->whereNull('read_at')->update(['read_at' => now()]);
        return ['ok' => true];
    }

    public function readAll(Request $r)
    {
        Feed::where('user_id', $r->user()->id)->whereNull('read_at')->update(['read_at' => now()]);
        return ['ok' => true];
    }
}
