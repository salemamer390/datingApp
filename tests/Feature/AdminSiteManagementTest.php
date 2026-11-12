<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Feed;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSiteManagementTest extends TestCase
{
    use RefreshDatabase;

    private function member(array $o = []): User
    {
        static $n = 0;
        $n++;
        return User::unguarded(fn () => User::create($o + ['name' => "M$n", 'email' => "m$n@example.com", 'password' => 'password123', 'gender' => 'woman', 'age' => 30, 'onboarding_completed_at' => now()]));
    }

    private function admin(): User
    {
        return $this->member(['is_admin' => true, 'email' => 'admin@example.com']);
    }

    public function test_registration_is_open_by_default_and_signup_works(): void
    {
        $this->assertTrue(SiteSetting::registrationsOpen());
        $this->postJson('/api/signup', ['name' => 'New', 'email' => 'new@example.com', 'password' => 'password123'])->assertOk();
    }

    public function test_signup_is_blocked_with_a_friendly_message_when_registration_is_closed(): void
    {
        SiteSetting::set('registrations_open', '0');
        $this->postJson('/api/signup', ['name' => 'New', 'email' => 'new@example.com', 'password' => 'password123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'New registrations are currently closed. Please check back soon.');
        $this->assertFalse(User::where('email', 'new@example.com')->exists());
    }

    public function test_admin_can_read_and_toggle_registration_but_members_cannot(): void
    {
        $this->getJson('/api/admin/site-controls')->assertUnauthorized();
        $admin = $this->admin();
        $this->actingAs($admin)->getJson('/api/admin/site-controls')->assertOk()->assertJsonPath('registrations_open', true);
        $this->actingAs($admin)->putJson('/api/admin/site-controls', ['registrations_open' => false])
            ->assertOk()->assertJsonPath('registrations_open', false);
        $this->assertSame('0', SiteSetting::get('registrations_open'));
        $this->actingAs($admin)->putJson('/api/admin/site-controls', ['registrations_open' => true])
            ->assertOk()->assertJsonPath('registrations_open', true);

        $member = $this->member();
        $this->actingAs($member)->getJson('/api/admin/site-controls')->assertForbidden();
        $this->actingAs($member)->putJson('/api/admin/site-controls', ['registrations_open' => false])->assertForbidden();
    }

    public function test_system_reports_read_only_health(): void
    {
        $admin = $this->admin();
        $j = $this->actingAs($admin)->getJson('/api/admin/system')->assertOk()->json();
        foreach (['php', 'laravel', 'environment', 'debug', 'database', 'checks', 'registrations_open', 'mailer', 'mail_note'] as $k) {
            $this->assertArrayHasKey($k, $j);
        }
        $this->assertTrue($j['database']['ok']);
        $this->assertTrue($j['checks']['site_settings table']);
        $this->assertTrue($j['checks']['announcements table']);
        $this->actingAs($this->member())->getJson('/api/admin/system')->assertForbidden();
    }

    public function test_audience_counts_real_members_minus_demos_and_opt_outs(): void
    {
        $admin = $this->admin();
        $this->member();
        $this->member(['settings' => ['notify6' => false]]);
        $this->member(['is_demo' => true]);

        // the admin account is itself a real member, so the audience is 2
        $this->actingAs($admin)->getJson('/api/admin/announcements/audience')->assertOk()->assertJsonPath('recipients', 2);
    }

    public function test_announcement_reaches_eligible_members_notification_feed_only(): void
    {
        $admin = $this->admin();
        $member = $this->member();
        $optedOut = $this->member(['settings' => ['notify6' => false]]);
        $demo = $this->member(['is_demo' => true]);

        $this->actingAs($admin)->postJson('/api/admin/announcements', [
            'title' => 'Welcome', 'body' => 'Thanks for joining LoveConnect.',
        ])->assertOk()->assertJsonPath('recipient_count', 2);

        $a = Announcement::sole();
        $this->assertSame('Welcome', $a->title);
        $this->assertSame($admin->id, $a->created_by);
        $this->assertSame(2, $a->recipient_count);

        $this->assertTrue(Feed::where('type', 'announcement')->where('user_id', $member->id)->exists());
        $this->assertTrue(Feed::where('type', 'announcement')->where('user_id', $admin->id)->exists());
        $this->assertFalse(Feed::where('type', 'announcement')->where('user_id', $optedOut->id)->exists());
        $this->assertFalse(Feed::where('type', 'announcement')->where('user_id', $demo->id)->exists());

        $n = $this->actingAs($member)->getJson('/api/notifications')->assertOk()->json();
        $ann = collect($n['notifications'])->firstWhere('type', 'announcement');
        $this->assertSame('Welcome', $ann['title']);
        $this->assertSame('Thanks for joining LoveConnect.', $ann['body']);
    }

    public function test_announcement_input_is_validated_and_history_is_listed(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->postJson('/api/admin/announcements', ['title' => '', 'body' => ''])->assertUnprocessable();
        $this->actingAs($admin)->postJson('/api/admin/announcements', [
            'title' => str_repeat('x', 121), 'body' => 'ok',
        ])->assertUnprocessable();

        Announcement::create(['title' => 'Past', 'body' => 'Old news', 'created_by' => $admin->id, 'recipient_count' => 5]);
        $j = $this->actingAs($admin)->getJson('/api/admin/announcements')->assertOk()->json();
        $this->assertCount(1, $j['data']);
        $this->assertSame('Past', $j['data'][0]['title']);
        $this->assertSame(5, $j['data'][0]['recipient_count']);
        $this->assertSame($admin->name, $j['data'][0]['created_by']);
    }

    public function test_members_and_guests_cannot_send_or_list_announcements(): void
    {
        $this->postJson('/api/admin/announcements', ['title' => 'x', 'body' => 'y'])->assertUnauthorized();
        $this->actingAs($this->member())->postJson('/api/admin/announcements', ['title' => 'x', 'body' => 'y'])->assertForbidden();
        $this->actingAs($this->member())->getJson('/api/admin/announcements')->assertForbidden();
        $this->assertSame(0, Announcement::count());
    }
}
