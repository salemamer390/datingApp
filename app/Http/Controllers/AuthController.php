<?php

namespace App\Http\Controllers;

use App\Models\Feed;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function signup(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:60',
            'email' => 'required|email|max:190|unique:users,email',
            'password' => 'required|string|min:8|max:100',
            'gender' => 'nullable|in:man,woman',
            'goal' => 'nullable|in:serious,friendship,casual',
        ]);
        $user = User::create([
            'name' => trim($d['name']), 'email' => strtolower($d['email']), 'password' => $d['password'],
            'gender' => $d['gender'] ?? null, 'goal' => $d['goal'] ?? 'serious', 'last_seen_at' => now(),
        ]);
        Feed::create(['user_id' => $user->id, 'type' => 'safety', 'title' => 'Keep your account safe',
            'body' => 'Never share passwords or financial information with other members.']);
        Auth::login($user);
        $r->session()->regenerate();
        return ['ok' => true];
    }

    public function login(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        if (! Auth::attempt(['email' => strtolower($d['email']), 'password' => $d['password']])) {
            return response()->json(['message' => 'Email or password is incorrect.'], 422);
        }
        $r->session()->regenerate();
        $r->user()->forceFill(['last_seen_at' => now()])->save();
        return ['ok' => true];
    }

    public function logout(Request $r)
    {
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        return ['ok' => true];
    }
}
