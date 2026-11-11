<?php

namespace App\Http\Controllers;

use App\Models\Block;
use App\Models\Favorite;
use App\Models\Like;
use App\Models\ProfileView;
use App\Support\Lc;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function show(Request $r, string $kind)
    {
        $me = $r->user()->id;
        $hidden = Lc::hiddenIds($me);
        $map = [
            'liked-me' => [Like::class, 'target_id', 'user_id'],
            'my-likes' => [Like::class, 'user_id', 'target_id'],
            'favorited-me' => [Favorite::class, 'target_id', 'user_id'],
            'my-favorites' => [Favorite::class, 'user_id', 'target_id'],
            'viewed-me' => [ProfileView::class, 'viewed_id', 'viewer_id'],
            'i-viewed' => [ProfileView::class, 'viewer_id', 'viewed_id'],
        ];
        if ($kind === 'blocked') {
            $rows = Block::with('target')->where('user_id', $me)->latest()->get();
            return ['entries' => $rows->map(fn ($b) => ['member' => $b->target->card(), 'at' => $b->created_at])->values()];
        }
        abort_unless(isset($map[$kind]), 404);
        [$model, $mine, $other] = $map[$kind];
        $rel = $model === ProfileView::class ? ($other === 'viewer_id' ? 'viewer' : 'viewed') : ($other === 'user_id' ? 'user' : 'target');
        $rows = $model::with($rel)->where($mine, $me)->whereNotIn($other, $hidden)->orderByDesc('updated_at')->limit(200)->get();
        $ids = $rows->pluck($other)->all();
        $liked = Like::where('user_id', $me)->whereIn('target_id', $ids)->pluck('target_id')->flip();
        $fav = Favorite::where('user_id', $me)->whereIn('target_id', $ids)->pluck('target_id')->flip();
        return ['entries' => $rows->map(fn ($x) => [
            'member' => $x->$rel->card() + ['liked' => isset($liked[$x->$rel->id]), 'favorite' => isset($fav[$x->$rel->id])],
            'at' => $x->updated_at,
        ])->values()];
    }
}
