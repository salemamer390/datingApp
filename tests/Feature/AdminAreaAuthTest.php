<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAreaAuthTest extends TestCase
{
    use RefreshDatabase;

    private function member(array $o = []): User
    {
        static $n = 0;
        $n++;
        return User::unguarded(fn () => User::create($o + ['name' => "M$n", 'email' => "m$n@example.com", 'password' => 'password123', 'gender' => 'woman', 'age' => 30, 'onboarding_completed_at' => now()]));
    }

    public function test_guests_opening_the_dashboard_are_sent_to_the_admin_sign_in_page(): void
    {
        $this->get('/admin.html')->assertRedirect('/admin-login.html');
    }

    public function test_admin_sign_in_page_is_public_and_hands_admins_over_to_the_dashboard(): void
    {
        $this->get('/admin-login.html')->assertOk();
        $this->actingAs($this->member())->get('/admin-login.html')->assertOk();
        $this->actingAs($this->member(['is_admin' => true]))->get('/admin-login.html')->assertRedirect('/admin.html');
    }

    public function test_admin_login_signs_in_an_admin_and_sends_them_to_the_dashboard(): void
    {
        $admin = $this->member(['is_admin' => true, 'email' => 'owner@example.com']);
        $this->postJson('/api/admin-login', ['email' => 'owner@example.com', 'password' => 'password123'])
            ->assertOk()->assertJsonPath('redirect', '/admin.html');
        $this->assertAuthenticatedAs($admin);
        $this->get('/admin.html')->assertOk();
    }

    public function test_admin_login_refuses_members_and_does_not_leave_them_signed_in(): void
    {
        $this->member(['email' => 'nadia@example.com']);
        $this->postJson('/api/admin-login', ['email' => 'nadia@example.com', 'password' => 'password123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'This sign-in is for the site owner only.');
        $this->assertGuest();
    }

    public function test_admin_login_rejects_wrong_password(): void
    {
        $this->member(['is_admin' => true, 'email' => 'owner@example.com']);
        $this->postJson('/api/admin-login', ['email' => 'owner@example.com', 'password' => 'wrong-password'])->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_member_login_endpoint_still_works_for_members(): void
    {
        $m = $this->member(['email' => 'nadia@example.com']);
        $this->postJson('/api/login', ['email' => 'nadia@example.com', 'password' => 'password123'])->assertOk();
        $this->assertAuthenticatedAs($m);
    }
}
