<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Feed;
use App\Models\User;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /** Real members who did not switch off "Website updates" (notify6) in their settings. */
    public static function audienceIds(): array
    {
        $ids = [];
        User::where('is_demo', false)->select('id', 'settings')->chunk(200, function ($rows) use (&$ids) {
            foreach ($rows as $u) {
                if (($u->settings['notify6'] ?? true) !== false) {
                    $ids[] = $u->id;
                }
            }
        });
        return $ids;
    }

    public function audience()
    {
        return ['recipients' => count(self::audienceIds())];
    }

    public function index()
    {
        return ['data' => Announcement::with('creator:id,name')->orderByDesc('id')->limit(50)->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'body' => $a->body,
                'recipient_count' => $a->recipient_count,
                'created_by' => $a->creator?->name,
                'created_at' => $a->created_at?->toIso8601String(),
            ])->values()];
    }

    public function store(Request $r)
    {
        $d = $r->validate(['title' => 'required|string|max:120', 'body' => 'required|string|max:1000']);
        $ids = self::audienceIds();
        $a = Announcement::create([
            'title' => trim($d['title']), 'body' => trim($d['body']),
            'created_by' => $r->user()->id, 'recipient_count' => count($ids),
        ]);
        $now = now();
        foreach (array_chunk($ids, 250) as $chunk) {
            Feed::insert(array_map(fn ($id) => [
                'user_id' => $id, 'actor_id' => null, 'type' => 'announcement',
                'title' => $a->title, 'body' => $a->body, 'href' => null,
                'read_at' => null, 'created_at' => $now, 'updated_at' => $now,
            ], $chunk));
        }
        return ['ok' => true, 'recipient_count' => count($ids)];
    }
}
