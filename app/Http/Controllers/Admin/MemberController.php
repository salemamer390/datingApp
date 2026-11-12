<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    public static function row(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'photo' => $u->photo_url,
            'age' => $u->age,
            'gender' => $u->gender,
            'city' => $u->city,
            'country' => $u->country,
            'is_demo' => (bool) $u->is_demo,
            'is_admin' => (bool) $u->is_admin,
            'suspended' => $u->suspended_at !== null,
            'last_seen_at' => $u->last_seen_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
            'photos_count' => (int) ($u->photos_count ?? 0),
            'reports_total' => (int) ($u->reports_total ?? 0),
            'reports_pending' => (int) ($u->reports_pending ?? 0),
        ];
    }

    private function baseQuery()
    {
        return User::query()->withCount([
            'photos',
            'reportsReceived as reports_total',
            'reportsReceived as reports_pending' => fn ($w) => $w->where('status', 'pending'),
        ]);
    }

    public function index(Request $r)
    {
        $q = $this->baseQuery();
        if (($s = trim((string) $r->query('q', ''))) !== '') {
            $q->where(fn ($w) => $w->whereRaw('lower(name) like ?', ['%' . strtolower($s) . '%'])
                ->orWhereRaw('lower(email) like ?', ['%' . strtolower($s) . '%']));
        }
        switch ($r->query('tab', 'all')) {
            case 'suspended': $q->whereNotNull('suspended_at'); break;
            case 'reported': $q->whereHas('reportsReceived', fn ($w) => $w->where('status', 'pending')); break;
            case 'admins': $q->where('is_admin', true); break;
            case 'demo': $q->where('is_demo', true); break;
            default: $q->where('is_demo', false);
        }
        $page = $q->orderByDesc('id')->paginate(15)->withQueryString();
        return [
            'data' => $page->getCollection()->map(fn ($u) => self::row($u))->values(),
            'total' => $page->total(), 'page' => $page->currentPage(), 'pages' => $page->lastPage(),
        ];
    }

    public function show(User $user)
    {
        $user->loadCount([
            'photos',
            'reportsReceived as reports_total',
            'reportsReceived as reports_pending' => fn ($w) => $w->where('status', 'pending'),
        ]);
        $recent = Report::with(['reporter:id,name', 'reviewer:id,name'])
            ->where('target_id', $user->id)->orderByDesc('id')->limit(10)->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'status' => $r->status,
                'reason' => $r->reason,
                'created_at' => $r->created_at?->toIso8601String(),
                'reporter' => $r->reporter?->name,
                'reviewer' => $r->reviewer?->name,
                'admin_note' => $r->admin_note,
            ])->values();
        return [
            'member' => self::row($user) + [
                'bio' => $user->bio,
                'goal' => $user->goal,
                'interests' => $user->interests,
                'phone' => $user->phone,
                'onboarding_complete' => $user->hasCompletedOnboarding(),
            ],
            'reports' => $recent,
        ];
    }

    public function suspend(Request $r, User $user)
    {
        abort_if($user->id === $r->user()->id, 422, 'You cannot suspend your own account.');
        abort_if($user->is_admin, 422, 'Admin accounts cannot be suspended.');
        if ($user->suspended_at === null) {
            $user->forceFill(['suspended_at' => now()])->save();
        }
        return ['suspended' => true];
    }

    public function unsuspend(User $user)
    {
        $user->forceFill(['suspended_at' => null])->save();
        return ['suspended' => false];
    }
}
