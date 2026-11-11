<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    private const SETTING_KEYS = ['privacy1', 'privacy2', 'privacy3', 'privacy4', 'privacy5', 'notify1', 'notify2', 'notify3', 'notify4', 'notify5', 'notify6', 'lookingFor', 'prefGender', 'ageRange', 'distanceRange', 'prefInterests', 'profileExtra'];

    public function profile(Request $r)
    {
        $d = $r->validate([
            'name' => 'nullable|string|max:60',
            'age' => 'nullable|integer|min:18|max:100',
            'gender' => 'nullable|in:man,woman',
            'city' => 'nullable|string|max:80',
            'country' => 'nullable|string|max:80',
            'region' => 'nullable|string|max:80',
            'bio' => 'nullable|string|max:2000',
            'goal' => 'nullable|in:serious,friendship,casual',
            'interests' => 'nullable|string|max:200',
        ]);
        $u = $r->user();
        $u->fill(array_filter($d, fn ($v) => $v !== null && $v !== ''));
        // Fields the member explicitly cleared.
        foreach (['bio', 'city', 'country', 'interests'] as $k) {
            if (array_key_exists($k, $d) && ($d[$k] === null || $d[$k] === '')) { $u->$k = null; }
        }
        $u->save();
        return ['ok' => true];
    }

    public function settings(Request $r)
    {
        $in = $r->validate([
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')->ignore($r->user()->id)],
            'phone' => 'nullable|string|max:30',
            'language' => 'nullable|in:en,ar,fr',
            'password' => 'nullable|string|min:8|max:100',
            'settings' => 'nullable|array',
        ]);
        $u = $r->user();
        if (! empty($in['email'])) { $u->email = strtolower($in['email']); }
        if (array_key_exists('phone', $in)) { $u->phone = $in['phone'] ?: null; }
        if (! empty($in['language'])) { $u->language = $in['language']; }
        if (! empty($in['password'])) { $u->password = $in['password']; }
        if (! empty($in['settings'])) {
            $s = $u->settings ?? [];
            foreach ($in['settings'] as $k => $v) {
                if (in_array($k, self::SETTING_KEYS, true) && (is_scalar($v) || is_array($v))) { $s[$k] = $v; }
            }
            $u->settings = $s;
        }
        $u->save();
        return ['ok' => true];
    }

    public function uploadPhotos(Request $r)
    {
        $r->validate(['photos' => 'required|array|max:9', 'photos.*' => 'file|image|mimes:jpg,jpeg,png,webp|max:5120']);
        $u = $r->user();
        $have = $u->photos()->count();
        foreach ($r->file('photos') as $file) {
            if ($have >= 9) { break; }
            $path = $file->store("photos/{$u->id}", 'local');
            Photo::create(['user_id' => $u->id, 'path' => $path, 'position' => $have]);
            $have++;
        }
        $this->syncMain($u);
        return ['ok' => true, 'photos' => $u->photos()->get()->map(fn ($p) => ['id' => $p->id, 'url' => $p->url()])];
    }

    public function deletePhoto(Request $r, Photo $photo)
    {
        abort_unless($photo->user_id === $r->user()->id, 404);
        Storage::disk('local')->delete($photo->path);
        $photo->delete();
        $this->syncMain($r->user());
        return ['ok' => true];
    }

    public function showPhoto(Request $r, Photo $photo)
    {
        $me = $r->user()->id;
        abort_unless($photo->user_id === $me || ! in_array($photo->user_id, \App\Support\Lc::hiddenIds($me), true), 404);
        abort_unless(Storage::disk('local')->exists($photo->path), 404);
        return Storage::disk('local')->response($photo->path, null, ['Cache-Control' => 'private, no-cache']);
    }

    private function syncMain($u): void
    {
        $first = $u->photos()->first();
        $u->photo_url = $first ? $first->url() : null;
        $u->save();
    }

    public function destroy(Request $r)
    {
        $r->validate(['password' => 'required|string']);
        $u = $r->user();
        abort_unless(Hash::check($r->input('password'), $u->password), 422, 'Password is incorrect.');
        foreach ($u->photos as $p) { Storage::disk('local')->delete($p->path); }
        Auth::logout();
        $u->delete();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        return ['ok' => true];
    }

}
