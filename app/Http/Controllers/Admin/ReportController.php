<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public static function shape(Report $r): array
    {
        return [
            'id' => $r->id,
            'status' => $r->status,
            'reason' => $r->reason,
            'admin_note' => $r->admin_note,
            'created_at' => $r->created_at?->toIso8601String(),
            'reviewed_at' => $r->reviewed_at?->toIso8601String(),
            'reviewer' => $r->reviewer?->name,
            'reporter' => $r->reporter ? ['id' => $r->reporter->id, 'name' => $r->reporter->name] : null,
            'target' => $r->target ? [
                'id' => $r->target->id,
                'name' => $r->target->name,
                'email' => $r->target->email,
                'photo' => $r->target->photo_url,
                'suspended' => $r->target->suspended_at !== null,
                'is_demo' => (bool) $r->target->is_demo,
            ] : null,
        ];
    }

    public function index(Request $r)
    {
        $status = $r->query('status', 'pending');
        $q = Report::query()
            ->with(['reporter:id,name', 'reviewer:id,name', 'target:id,name,email,photo_url,suspended_at,is_demo'])
            ->orderByDesc('id');
        if (in_array($status, Report::STATUSES, true)) {
            $q->where('status', $status);
        }
        $page = $q->paginate(15)->withQueryString();
        return [
            'data' => $page->getCollection()->map(fn ($x) => self::shape($x))->values(),
            'counts' => [
                'pending' => Report::where('status', 'pending')->count(),
                'resolved' => Report::where('status', 'resolved')->count(),
                'dismissed' => Report::where('status', 'dismissed')->count(),
                'total' => Report::count(),
            ],
            'total' => $page->total(), 'page' => $page->currentPage(), 'pages' => $page->lastPage(),
        ];
    }

    public function update(Request $r, Report $report)
    {
        $d = $r->validate([
            'status' => 'required|in:' . implode(',', Report::STATUSES),
            'admin_note' => 'nullable|string|max:500',
        ]);
        $report->status = $d['status'];
        if (array_key_exists('admin_note', $d)) {
            $report->admin_note = $d['admin_note'];
        }
        if ($d['status'] === 'pending') {
            $report->reviewed_by = null;
            $report->reviewed_at = null;
        } else {
            $report->reviewed_by = $r->user()->id;
            $report->reviewed_at = now();
        }
        $report->save();
        return ['ok' => true, 'report' => self::shape($report->load(['reporter:id,name', 'reviewer:id,name', 'target:id,name,email,photo_url,suspended_at,is_demo']))];
    }
}
