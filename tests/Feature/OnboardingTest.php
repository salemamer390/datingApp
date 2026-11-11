<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    private function signup(): User
    {
        $this->postJson('/api/signup', ['name' => 'New member', 'email' => 'new@example.com', 'password' => 'password123'])
            ->assertOk()->assertJsonPath('redirect', '/onboarding.html');
        return User::where('email', 'new@example.com')->firstOrFail();
    }

    private function basics(): array
    {
        return ['name' => 'Nora', 'age' => 27, 'gender' => 'woman', 'country' => 'Egypt', 'city' => 'Cairo'];
    }

    private function complete(): User
    {
        $user = $this->signup();
        $this->putJson('/api/onboarding/1', $this->basics())->assertOk();
        $this->putJson('/api/onboarding/2', ['goal' => 'serious', 'prefGender' => 'Men'])->assertOk();
        $this->putJson('/api/onboarding/3', ['interests' => 'Books, Music, Books'])->assertOk();
        $this->putJson('/api/onboarding/4', ['bio' => 'I enjoy reading.'])->assertOk()->assertJsonPath('redirect', '/discover.html');
        return $user->fresh();
    }

    public function test_new_member_is_gated_on_pages_and_api_until_complete(): void
    {
        $user = $this->signup();
        $this->assertAuthenticatedAs($user);
        $this->assertNull($user->onboarding_completed_at);
        foreach (['discover', 'search', 'member', 'messages', 'my-profile', 'settings-profile', 'view-profile'] as $page) {
            $this->get("/$page.html")->assertRedirect('/onboarding.html');
        }
        foreach (['members', 'members/'.$user->id, 'notifications', 'conversations'] as $path) {
            $this->getJson("/api/$path")->assertForbidden()->assertJsonPath('redirect', '/onboarding.html');
        }
        $this->get('/onboarding.html')->assertOk()->assertSee('A profile that feels like you');
        $this->putJson('/api/onboarding/4', ['bio' => 'Skipping steps'])->assertUnprocessable();
        $this->assertNull($user->fresh()->onboarding_completed_at);
    }

    public function test_completion_persists_public_answers_but_keeps_login_and_preferences_private(): void
    {
        $user = $this->complete();
        $this->assertNotNull($user->onboarding_completed_at);
        $this->assertSame(27, $user->age);
        $this->assertSame('Books, Music', $user->interests);
        $this->assertSame('Men', $user->settings['prefGender']);
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->get('/discover.html')->assertOk();
        $this->get('/onboarding.html')->assertRedirect('/discover.html');
        $other = User::unguarded(fn () => User::create(['name' => 'Other', 'email' => 'other@example.com', 'password' => 'password123', 'onboarding_completed_at' => now()]));
        $response = $this->actingAs($other)->getJson("/api/members/{$user->id}")->assertOk();
        $this->assertSame('Nora', $response->json('member.name'));
        foreach (['email', 'phone', 'password', 'settings', 'prefGender', 'onboarding_completed_at'] as $field) {
            $this->assertArrayNotHasKey($field, $response->json('member'));
        }
    }

    public function test_partial_answers_resume_after_logout_and_login(): void
    {
        $this->signup();
        $this->putJson('/api/onboarding/1', $this->basics())->assertOk();
        $this->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', ['email' => 'new@example.com', 'password' => 'password123'])->assertOk()->assertJsonPath('redirect', '/onboarding.html');
        $this->get('/onboarding.html')->assertOk()->assertSee('Cairo');
        $this->get('/discover.html')->assertRedirect('/onboarding.html');
    }

    public function test_completed_member_returns_without_repeating_questions(): void
    {
        $this->complete();
        $this->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', ['email' => 'new@example.com', 'password' => 'password123'])->assertOk()->assertJsonPath('redirect', '/discover.html');
        $this->get('/onboarding.html')->assertRedirect('/discover.html');
    }

    public function test_basics_validate_adult_age_and_reject_empty_or_invalid_answers(): void
    {
        $this->signup();
        foreach ([17, 101, 18.5] as $age) {
            $this->putJson('/api/onboarding/1', array_replace($this->basics(), ['age' => $age]))->assertUnprocessable();
        }
        $this->putJson('/api/onboarding/1', array_replace($this->basics(), ['city' => '   ', 'gender' => 'invalid']))->assertUnprocessable();
        $this->putJson('/api/onboarding/1', array_replace($this->basics(), ['age' => 18]))->assertOk();
        $this->putJson('/api/onboarding/2', ['goal' => 'other', 'prefGender' => 'Other'])->assertUnprocessable();
        $this->putJson('/api/onboarding/3', ['interests' => ', ,'])->assertUnprocessable();
        $this->putJson('/api/onboarding/3', ['interests' => implode(',', range(1, 13))])->assertUnprocessable();
    }

    public function test_cannot_forge_completion_with_generic_profile_or_settings_updates(): void
    {
        $user = $this->signup();
        $this->putJson('/api/account/profile', $this->basics() + ['onboarding_completed_at' => '2026-11-11', 'is_demo' => true])->assertOk();
        $this->putJson('/api/account/settings', ['settings' => ['onboarding_completed_at' => true]])->assertOk();
        $this->assertNull($user->fresh()->onboarding_completed_at);
        $this->assertFalse($user->fresh()->is_demo);
        $this->getJson('/api/members')->assertForbidden();
    }

    public function test_optional_bio_and_photo_can_be_skipped_and_profile_can_be_edited_later(): void
    {
        $user = $this->signup();
        $this->putJson('/api/onboarding/1', $this->basics())->assertOk();
        $this->putJson('/api/onboarding/2', ['goal' => 'friendship', 'prefGender' => 'Everyone'])->assertOk();
        $this->putJson('/api/onboarding/3', ['interests' => 'Cooking'])->assertOk();
        $this->putJson('/api/onboarding/4', [])->assertOk();
        $this->assertNull($user->fresh()->photo_url);
        $this->putJson('/api/account/profile', ['bio' => 'Updated later', 'interests' => 'Cooking, Travel'])->assertOk();
        $this->assertSame('Updated later', $user->fresh()->bio);
        $this->assertTrue($user->fresh()->hasCompletedOnboarding());
    }

    public function test_pending_profile_is_not_visible_to_other_members(): void
    {
        $pending = $this->signup();
        $this->putJson('/api/onboarding/1', $this->basics())->assertOk();
        $other = User::unguarded(fn () => User::create(['name' => 'Other', 'email' => 'other@example.com', 'password' => 'password123', 'onboarding_completed_at' => now()]));
        $this->actingAs($other)->getJson("/api/members/{$pending->id}")->assertNotFound();
        $ids = collect($this->getJson('/api/members')->assertOk()->json('data'))->pluck('id');
        $this->assertFalse($ids->contains($pending->id));
    }

    public function test_onboarding_requires_authentication(): void
    {
        $this->get('/onboarding.html')->assertRedirect('/index.html?loginRequired=1');
        $this->putJson('/api/onboarding/1', $this->basics())->assertUnauthorized();
    }
}
