<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Block;
use App\Models\Favorite;
use App\Models\Like;
use App\Models\Message;
use App\Models\Photo;
use App\Models\ProfileView;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** Real counters only: everything shown on the dashboard is computed from the database. */
    public function overview()
    {
        $real = fn () => User::where('is_demo', false);
        $matches = DB::table('likes as a')
            ->join('likes as b', fn ($j) => $j->on('a.user_id', '=', 'b.target_id')->on('a.target_id', '=', 'b.user_id'))
            ->whereColumn('a.user_id', '<', 'a.target_id')->count();

        return [
            'members' => [
                'total' => $real()->count(),
                'demo' => User::where('is_demo', true)->count(),
                'new_7d' => $real()->where('created_at', '>', now()->subDays(7))->count(),
                'new_30d' => $real()->where('created_at', '>', now()->subDays(30))->count(),
                'online_now' => $real()->where('last_seen_at', '>', now()->subMinutes(5))->count(),
                'suspended' => User::whereNotNull('suspended_at')->count(),
            ],
            'activity' => [
                'messages' => Message::count(),
                'messages_7d' => Message::where('created_at', '>', now()->subDays(7))->count(),
                'likes' => Like::count(),
                'matches' => $matches,
                'favorites' => Favorite::count(),
                'blocks' => Block::count(),
                'profile_views' => ProfileView::count(),
                'photos' => Photo::count(),
            ],
            'reports' => [
                'pending' => Report::where('status', 'pending')->count(),
                'resolved' => Report::where('status', 'resolved')->count(),
                'dismissed' => Report::where('status', 'dismissed')->count(),
                'total' => Report::count(),
            ],
        ];
    }
}
