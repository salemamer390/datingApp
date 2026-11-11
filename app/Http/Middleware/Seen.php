<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class Seen
{
    public function handle(Request $request, Closure $next)
    {
        $u = $request->user();
        if ($u && (! $u->last_seen_at || $u->last_seen_at->lt(now()->subMinute()))) {
            $u->forceFill(['last_seen_at' => now()])->saveQuietly();
        }
        return $next($request);
    }
}
