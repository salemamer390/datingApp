<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $guarded = ['id', 'is_demo', 'onboarding_completed_at'];

    protected $hidden = ['password', 'remember_token', 'email', 'phone', 'settings'];

    protected function casts(): array
    {
        return ['password' => 'hashed', 'settings' => 'array', 'last_seen_at' => 'datetime', 'is_demo' => 'boolean', 'onboarding_completed_at' => 'datetime'];
    }

    public function hasCompletedOnboarding(): bool
    {
        return $this->onboarding_completed_at !== null;
    }

    public function photos()
    {
        return $this->hasMany(Photo::class)->orderBy('position')->orderBy('id');
    }

    public function isOnline(): bool
    {
        if (($this->settings['privacy5'] ?? true) === false) {
            return false;
        }
        return $this->is_demo ? ($this->id % 4 !== 0) : ($this->last_seen_at && $this->last_seen_at->gt(now()->subMinutes(5)));
    }

    /** Public card shape used by every list. $viewer = authenticated user id for like/favorite flags. */
    public function card(): array
    {
        $s = $this->settings ?? [];
        $showAge = ($s['privacy2'] ?? true) !== false;
        $showLoc = ($s['privacy3'] ?? true) !== false;
        $interests = array_values(array_filter(array_map('trim', explode(',', (string) $this->interests))));
        return [
            'id' => $this->id,
            'name' => $this->name,
            'age' => $showAge ? $this->age : null,
            'gender' => $this->gender,
            'region' => $this->region,
            'city' => $showLoc ? $this->city : null,
            'country' => $showLoc ? $this->country : null,
            'goal' => $this->goal,
            'bio' => $this->bio,
            'interests' => $interests,
            'photo' => $this->photo_url,
            'online' => $this->isOnline(),
            'isNew' => $this->created_at && $this->created_at->gt(now()->subDays(14)),
        ];
    }
}
