<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
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

    public function test_admin_endpoints_reject_guests_and_members(): void
    {
        foreach (['overview', 'reports', 'members'] as $p) {
            $this->getJson("/api/admin/$p")->assertStatus(401);
        }
        $this->actingAs($this->member());
        foreach (['overview', 'reports', 'members'] as $p) {
            $this->getJson("/api/admin/$p")->assertStatus(403);
        }
        $a = $this->member();
        $b = $this->member();
        Report::create(['reporter_id' => $a->id, 'target_id' => $b->id, 'reason' => 'x']);
        $this->putJson('/api/admin/reports/' . Report::first()->id, ['status' => 'resolved'])->assertStatus(403);
        $this->putJson("/api/admin/members/{$b->id}/suspend")->assertStatus(403);
    }

    public function test_admin_page_access_rules(): void
    {
        $this->get('/admin.html')->assertRedirect('/index.html?loginRequired=1');
        $this->actingAs($this->member())->get('/admin.html')->assertStatus(404);
        $this->actingAs($this->admin())->get('/admin.html')->assertOk();
    }

    public function test_overview_reports_real_counts(): void
    {
        $a = $this->member();
        $b = $this->member(['last_seen_at' => now()]);
        Message::create(['sender_id' => $a->id, 'recipient_id' => $b->id, 'body' => 'hi']);
        $this->actingAs($a)->postJson("/api/members/{$b->id}/like");
        $this->actingAs($b)->postJson("/api/members/{$a->id}/like"); // mutual like = 1 match
        $this->actingAs($a)->postJson("/api/members/{$b->id}/report", ['reason' => 'spam']);
        $a->forceFill(['last_seen_at' => now()->subHour()])->save(); // only b and the admin are online
        $j = $this->actingAs($this->admin())->getJson('/api/admin/overview')->assertOk()->json();
        $this->assertSame(3, $j['members']['total']); // three real members incl. the admin
        $this->assertSame(2, $j['members']['online_now']);
        $this->assertSame(1, $j['activity']['messages']);
        $this->assertSame(2, $j['activity']['likes']);
        $this->assertSame(1, $j['activity']['matches']);
        $this->assertSame(1, $j['reports']['pending']);
        $this->assertSame(1, $j['reports']['total']);
    }

    public function test_report_review_workflow(): void
    {
        $a = $this->member();
        $b = $this->member();
        $this->actingAs($a)->postJson("/api/members/{$b->id}/report", ['reason' => 'bad photos']);
        $admin = $this->admin();

        $j = $this->actingAs($admin)->getJson('/api/admin/reports')->assertOk()->json();
        $this->assertCount(1, $j['data']);
        $this->assertSame('pending', $j['data'][0]['status']);
        $this->assertSame($a->name, $j['data'][0]['reporter']['name']);
        $this->assertSame($b->email, $j['data'][0]['target']['email']);

        $id = $j['data'][0]['id'];
        $this->putJson("/api/admin/reports/$id", ['status' => 'nonsense'])->assertStatus(422);
        $r = $this->putJson("/api/admin/reports/$id", ['status' => 'resolved', 'admin_note' => 'warned the member'])->assertOk()->json('report');
        $this->assertSame('resolved', $r['status']);
        $this->assertSame('warned the member', $r['admin_note']);
        $this->assertSame($admin->name, $r['reviewer']);
        $this->assertNotNull($r['reviewed_at']);

        // Resolved reports leave the default pending list; reopening brings them back.
        $this->getJson('/api/admin/reports')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/admin/reports?status=resolved')->assertOk()->assertJsonCount(1, 'data');
        $this->putJson("/api/admin/reports/$id", ['status' => 'pending'])->assertOk();
        $this->assertNull(Report::find($id)->reviewed_at);
    }

    public function test_member_search_filters_and_detail(): void
    {
        $this->member(['name' => 'Nadia', 'email' => 'nadia@example.com']);
        $b = $this->member(['name' => 'Omar', 'email' => 'omar@example.com']);
        $this->member(['is_demo' => true, 'name' => 'Demo Dora']);
        $admin = $this->admin();
        $this->actingAs($this->member())->postJson("/api/members/{$b->id}/report", ['reason' => 'rude']);

        $j = $this->actingAs($admin)->getJson('/api/admin/members?q=nadia')->assertOk()->json();
        $this->assertCount(1, $j['data']);
        $this->assertSame('nadia@example.com', $j['data'][0]['email']);

        $j = $this->getJson('/api/admin/members?tab=reported')->assertOk()->json();
        $this->assertCount(1, $j['data']);
        $this->assertSame('Omar', $j['data'][0]['name']);
        $this->assertSame(1, $j['data'][0]['reports_pending']);

        $this->getJson('/api/admin/members?tab=demo')->assertOk()->assertJsonCount(1, 'data');

        $j = $this->getJson("/api/admin/members/{$b->id}")->assertOk()->json();
        $this->assertSame('omar@example.com', $j['member']['email']);
        $this->assertCount(1, $j['reports']);
        $this->assertSame('rude', $j['reports'][0]['reason']);
    }

    public function test_suspension_blocks_login_and_api_until_lifted(): void
    {
        $m = $this->member(['email' => 'target@example.com']);
        $admin = $this->admin();

        $this->actingAs($admin)->putJson("/api/admin/members/{$m->id}/suspend")->assertOk()->assertJson(['suspended' => true]);
        $this->assertSame($admin->id, $m->fresh()->suspended_by);
        $j = $this->getJson("/api/admin/members/{$m->id}")->assertOk()->json();
        $this->assertSame($admin->name, $j['member']['suspended_by']);

        // Existing session is cut off from the API but can still log out.
        $m = $m->fresh(); // actingAs holds an instance; reload so it carries suspended_at
        $this->actingAs($m)->getJson('/api/notifications')->assertStatus(403);
        $this->actingAs($m)->postJson('/api/logout')->assertOk();
        // Member pages bounce to the signed-out home with a suspension flag.
        $this->actingAs($m)->get('/discover.html')->assertRedirect('/index.html?suspended=1');
        // New logins are refused with a clear message.
        $this->postJson('/api/login', ['email' => 'target@example.com', 'password' => 'password123'])
            ->assertStatus(403)->assertJsonPath('message', 'This account is suspended. Contact support if you think this is a mistake.');

        $this->actingAs($admin)->deleteJson("/api/admin/members/{$m->id}/suspend")->assertOk()->assertJson(['suspended' => false]);
        $this->assertNull($m->fresh()->suspended_by);
        $this->postJson('/api/login', ['email' => 'target@example.com', 'password' => 'password123'])->assertOk();
    }

    public function test_suspension_guards(): void
    {
        $admin = $this->admin();
        $other = $this->member(['is_admin' => true, 'email' => 'admin2@example.com']);
        $this->actingAs($admin)->putJson("/api/admin/members/{$admin->id}/suspend")->assertStatus(422);
        $this->putJson("/api/admin/members/{$other->id}/suspend")->assertStatus(422);
        $this->assertNull($other->fresh()->suspended_at);
    }

    public function test_make_admin_command(): void
    {
        $m = $this->member(['email' => 'owner@example.com']);
        $this->artisan('loveconnect:make-admin', ['email' => 'nobody@example.com'])->assertExitCode(1);
        $this->artisan('loveconnect:make-admin', ['email' => 'OWNER@example.com'])->assertExitCode(0);
        $this->assertTrue($m->fresh()->is_admin);

        // The last admin cannot be removed.
        $this->artisan('loveconnect:make-admin', ['email' => 'owner@example.com', '--remove' => true])->assertExitCode(1);
        $second = $this->member(['is_admin' => true, 'email' => 'second@example.com']);
        $this->artisan('loveconnect:make-admin', ['email' => 'second@example.com', '--remove' => true])->assertExitCode(0);
        $this->assertFalse($second->fresh()->is_admin);
    }

    public function test_signup_cannot_self_promote_to_admin(): void
    {
        $this->postJson('/api/signup', ['name' => 'Eve', 'email' => 'eve@example.com', 'password' => 'password123', 'is_admin' => true, 'suspended_at' => null])->assertOk();
        $u = User::where('email', 'eve@example.com')->firstOrFail();
        $this->assertFalse($u->is_admin);
        $this->getJson('/api/admin/overview')->assertStatus(403);
    }
}
