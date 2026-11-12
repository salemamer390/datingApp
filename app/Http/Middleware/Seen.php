<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class Seen
{
    public function handle(Request $request, Closure $next)
    {
        $u = $request->user();
        // A suspended member is cut off from the member API but can still log out.
        if ($u && $u->isSuspended() && ! $request->is('api/logout')) {
            return response()->json(['message' => 'Your account is suspended. Contact support if you think this is a mistake.'], 403);
        }
        if ($u && (! $u->last_seen_at || $u->last_seen_at->lt(now()->subMinute()))) {
            $u->forceFill(['last_seen_at' => now()])->saveQuietly();
        }
        return $next($request);
    }
}
