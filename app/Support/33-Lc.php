<?php

namespace App\Support;

use App\Models\Block;
use App\Models\User;

class Lc
{
    public const GOALS = ['serious' => 'Serious relationship', 'friendship' => 'Friendship', 'casual' => 'Casual dating'];

    public static function goalLabel(?string $g): string
    {
        return self::GOALS[$g] ?? 'Serious relationship';
    }

    public static function goalKey(?string $label): string
    {
        $k = array_search($label, self::GOALS, true);
        return $k ?: 'serious';
    }

    /** IDs the user has blocked or who blocked the user. */
    public static function hiddenIds(int $uid): array
    {
        return Block::where('user_id', $uid)->pluck('target_id')
            ->merge(Block::where('target_id', $uid)->pluck('user_id'))->unique()->values()->all();
    }

    public static function me(User $u): array
    {
        $photos = $u->photos->map(fn ($p) => $p->url())->all();
        $s = $u->settings ?? [];
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->makeVisible(['email', 'phone'])->email,
            'phone' => $u->phone,
            'language' => $u->language,
            'photo' => $u->photo_url,
            'photos' => $photos,
            'photo_items' => $u->photos->map(fn ($p) => ['id' => $p->id, 'url' => $p->url()])->values()->all(),
            'gender' => $u->gender,
            'profile' => [
                'name' => $u->name,
                'age' => $u->age ? (string) $u->age : '',
                'city' => (string) $u->city,
                'country' => (string) $u->country,
                'bio' => (string) $u->bio,
                'goal' => self::goalLabel($u->goal),
                'interests' => (string) $u->interests,
            ],
            'settings' => (object) $s,
        ];
    }
}
