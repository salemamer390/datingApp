<?php

namespace Tests\Feature;

use App\Models\Feed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreferencesAndSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function member(array $o = []): User
    {
        static $n = 0;
        $n++;
        return User::unguarded(fn () => User::create($o + ['name' => "M$n", 'email' => "m$n@example.com", 'password' => 'password123',
            'gender' => 'woman', 'age' => 30, 'country' => 'Egypt', 'city' => 'Cairo', 'interests' => 'Music, Travel',
            'onboarding_completed_at' => now()]));
    }

    public function test_saved_gender_and_age_preferences_shape_discovery(): void
    {
        $me = $this->member(['gender' => 'man', 'settings' => ['prefGender' => 'Women', 'ageRange' => '30']]);
        $youngWoman = $this->member(['age' => 26]);
        $olderWoman = $this->member(['age' => 45]);
        $man = $this->member(['gender' => 'man', 'age' => 26]);

        $ids = collect($this->actingAs($me)->getJson('/api/members')->json('data'))->pluck('id');
        $this->assertContains($youngWoman->id, $ids);
        $this->assertNotContains($olderWoman->id, $ids); // above the saved age preference
        $this->assertNotContains($man->id, $ids);        // not the saved seeking gender
    }

    public function test_everyone_preference_and_no_preference_show_all_genders(): void
    {
        $me = $this->member(['gender' => 'man', 'settings' => ['prefGender' => 'Everyone']]);
        $woman = $this->member();
        $man = $this->member(['gender' => 'man']);
        $ids = collect($this->actingAs($me)->getJson('/api/members')->json('data'))->pluck('id');
        $this->assertContains($woman->id, $ids);
        $this->assertContains($man->id, $ids);

        $plain = $this->member(['gender' => 'man']);
        $ids2 = collect($this->actingAs($plain)->getJson('/api/members')->json('data'))->pluck('id');
        $this->assertContains($woman->id, $ids2);
        $this->assertContains($man->id, $ids2);
    }

    public function test_saved_interest_preference_matches_any_interest(): void
    {
        $me = $this->member(['gender' => 'man', 'settings' => ['prefInterests' => 'Cooking']]);
        $cook = $this->member(['interests' => 'Cooking, Books']);
        $gamer = $this->member(['interests' => 'Gaming']);
        $ids = collect($this->actingAs($me)->getJson('/api/members')->json('data'))->pluck('id');
        $this->assertContains($cook->id, $ids);
        $this->assertNotContains($gamer->id, $ids);
    }

    public function test_explicit_filters_override_saved_preferences(): void
    {
        $me = $this->member(['gender' => 'man', 'settings' => ['prefGender' => 'Women']]);
        $man = $this->member(['gender' => 'man', 'age' => 28]);
        $ids = collect($this->actingAs($me)->getJson('/api/members?filtered=1&min=18&max=100&gender=man')->json('data'))->pluck('id');
        $this->assertContains($man->id, $ids);
    }

    public function test_safety_alert_toggle_hides_safety_notifications(): void
    {
        $me = $this->member();
        Feed::create(['user_id' => $me->id, 'type' => 'safety', 'title' => 'Keep your account safe']);
        Feed::create(['user_id' => $me->id, 'type' => 'like', 'title' => 'Someone liked your profile']);

        $types = collect($this->actingAs($me)->getJson('/api/notifications')->json('notifications'))->pluck('type');
        $this->assertContains('safety', $types);
        $this->assertContains('like', $types);

        $this->actingAs($me)->putJson('/api/account/settings', ['settings' => ['notifySafety' => false]])->assertOk();
        $types = collect($this->actingAs($me)->getJson('/api/notifications')->json('notifications'))->pluck('type');
        $this->assertNotContains('safety', $types);
        $this->assertContains('like', $types);
    }

    public function test_signup_carries_quick_start_gender_and_goal(): void
    {
        $this->postJson('/api/signup', ['name' => 'Quick', 'email' => 'quick@example.com', 'password' => 'password123',
            'gender' => 'woman', 'goal' => 'friendship'])->assertOk();
        $u = User::where('email', 'quick@example.com')->firstOrFail();
        $this->assertSame('woman', $u->gender);
        $this->assertSame('friendship', $u->goal);
    }
    public function test_password_change_requires_current_password(): void
    {
        $u = $this->member();
        $this->actingAs($u);

        $this->putJson('/api/account/settings', ['password' => 'newpassword1'])->assertStatus(422);
        $this->putJson('/api/account/settings', ['password' => 'newpassword1', 'current_password' => 'wrong-pass'])->assertStatus(422);
        $this->putJson('/api/account/settings', ['password' => 'newpassword1', 'current_password' => 'password123'])->assertOk();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('newpassword1', $u->fresh()->password));
    }
}
