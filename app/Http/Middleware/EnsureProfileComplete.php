<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureProfileComplete
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user()->hasCompletedOnboarding()) {
            return response()->json(['message' => 'Please complete your profile first.', 'redirect' => '/onboarding.html'], 403);
        }
        return $next($request);
    }
}
