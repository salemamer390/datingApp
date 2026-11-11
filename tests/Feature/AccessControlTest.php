<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Like;
use App\Models\Message;
use App\Models\Photo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    private function member(array $o = []): User
    {
        static $n = 0;
        $n++;
        return User::unguarded(fn () => User::create($o + ['name' => "M$n", 'email' => "m$n@example.com", 'password' => 'password123', 'gender' => 'woman', 'age' => 30, 'onboarding_completed_at' => now()]));
    }

    public function test_guests_cannot_use_api_or_protected_pages(): void
    {
        foreach (['members', 'conversations', 'notifications', 'activity/blocked'] as $p) {
            $this->getJson("/api/$p")->assertStatus(401);
        }
        $this->postJson('/api/messages/1', ['body' => 'x'])->assertStatus(401);
        $this->get('/discover.html')->assertRedirect('/index.html?loginRequired=1');
        $this->get('/index.html')->assertOk();
    }

    public function test_signup_validation_and_login_throttle_basics(): void
    {
        $this->postJson('/api/signup', ['name' => 'A', 'email' => 'bad', 'password' => 'short'])->assertStatus(422);
        $this->postJson('/api/signup', ['name' => 'Ann', 'email' => 'ann@example.com', 'password' => 'password123'])->assertOk();
        $this->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', ['email' => 'ann@example.com', 'password' => 'wrong-pass'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'ann@example.com', 'password' => 'password123'])->assertOk();
    }

    public function test_messages_respect_allow_everyone_setting(): void
    {
        $a = $this->member(); $b = $this->member();
        $this->actingAs($a)->postJson("/api/messages/{$b->id}", ['body' => 'hi'])->assertStatus(403);
        $this->assertSame(0, Message::count());

        // Recipient opts in to everyone.
        $b->update(['settings' => ['privacy4' => true]]);
        $this->actingAs($a)->postJson("/api/messages/{$b->id}", ['body' => 'hi'])->assertOk();

        // Opt-out again: a person the recipient liked may write, and the recipient may always reply.
        $c = $this->member(); $d = $this->member(['settings' => ['privacy4' => false]]);
        $this->actingAs($c)->postJson("/api/messages/{$d->id}", ['body' => 'x'])->assertStatus(403);
        Like::create(['user_id' => $d->id, 'target_id' => $c->id]);
        $this->actingAs($c)->postJson("/api/messages/{$d->id}", ['body' => 'x'])->assertOk();
    }

    public function test_blocked_users_cannot_message_or_see_each_other(): void
    {
        $a = $this->member(); $b = $this->member(['settings' => ['privacy4' => true]]);
        Block::create(['user_id' => $b->id, 'target_id' => $a->id]);
        $this->actingAs($a)->postJson("/api/messages/{$b->id}", ['body' => 'hi'])->assertStatus(404);
        $this->actingAs($a)->getJson("/api/messages/{$b->id}")->assertStatus(404);
        $this->actingAs($a)->getJson("/api/members/{$b->id}")->assertStatus(404);
        $this->actingAs($a)->postJson("/api/members/{$b->id}/like")->assertStatus(404);
        $this->actingAs($b)->getJson("/api/members/{$a->id}")->assertStatus(404);
        $ids = collect($this->actingAs($a)->getJson('/api/members')->json('data'))->pluck('id');
        $this->assertFalse($ids->contains($b->id));
    }

    public function test_cannot_message_or_like_yourself_and_body_is_validated(): void
    {
        $a = $this->member(['settings' => ['privacy4' => true]]);
        $this->actingAs($a)->postJson("/api/messages/{$a->id}", ['body' => 'x'])->assertStatus(422);
        $this->actingAs($a)->postJson("/api/members/{$a->id}/like")->assertStatus(422);
        $b = $this->member(['settings' => ['privacy4' => true]]);
        $this->actingAs($a)->postJson("/api/messages/{$b->id}", ['body' => '   '])->assertStatus(422);
        $this->actingAs($a)->postJson("/api/messages/{$b->id}", ['body' => str_repeat('x', 1001)])->assertStatus(422);
    }

    public function test_thread_only_contains_my_own_conversation(): void
    {
        $a = $this->member(); $b = $this->member(); $c = $this->member();
        Message::create(['sender_id' => $b->id, 'recipient_id' => $c->id, 'body' => 'secret between b and c']);
        $res = $this->actingAs($a)->getJson("/api/messages/{$b->id}")->assertOk();
        $this->assertCount(0, $res->json('messages'));
        $this->assertCount(0, $this->actingAs($a)->getJson('/api/conversations')->json('conversations'));
    }

    public function test_hidden_from_discovery_setting_is_enforced(): void
    {
        $a = $this->member(); $b = $this->member(['settings' => ['privacy1' => false]]);
        $ids = collect($this->actingAs($a)->getJson('/api/members')->json('data'))->pluck('id');
        $this->assertFalse($ids->contains($b->id));
    }

    public function test_privacy_hides_age_and_location(): void
    {
        $a = $this->member(); $b = $this->member(['city' => 'Cairo', 'country' => 'Egypt', 'settings' => ['privacy2' => false, 'privacy3' => false]]);
        $m = $this->actingAs($a)->getJson("/api/members/{$b->id}")->json('member');
        $this->assertNull($m['age']); $this->assertNull($m['city']); $this->assertNull($m['country']);
    }

    public function test_notifications_are_private_to_their_owner(): void
    {
        $a = $this->member(['settings' => ['privacy4' => true]]); $b = $this->member(['settings' => ['privacy4' => true]]);
        $this->actingAs($a)->postJson("/api/messages/{$b->id}", ['body' => 'hello'])->assertOk();
        $n = $this->actingAs($b)->getJson('/api/notifications')->json('notifications');
        $this->assertCount(1, $n);
        $this->actingAs($a)->postJson("/api/notifications/{$n[0]['id']}/read")->assertOk();
        $this->assertTrue($this->actingAs($b)->getJson('/api/notifications')->json('notifications.0.unread'));
    }

    public function test_photo_upload_rules_and_ownership(): void
    {
        Storage::fake('local');
        $a = $this->member(); $b = $this->member();
        $this->actingAs($a)->post('/api/account/photos', ['photos' => [UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')]], ['Accept' => 'application/json'])->assertStatus(422);
        $this->actingAs($a)->post('/api/account/photos', ['photos' => [UploadedFile::fake()->image('a.png')]], ['Accept' => 'application/json'])->assertOk();
        $photo = Photo::where('user_id', $a->id)->firstOrFail();
        $this->assertNotNull($a->fresh()->photo_url);
        $this->actingAs($b)->deleteJson("/api/account/photos/{$photo->id}")->assertStatus(404);
        $this->actingAs($a)->deleteJson("/api/account/photos/{$photo->id}")->assertOk();
        $this->assertNull($a->fresh()->photo_url);
    }

    public function test_settings_whitelist_and_email_uniqueness(): void
    {
        $a = $this->member(); $b = $this->member();
        $this->actingAs($a)->putJson('/api/account/settings', ['email' => $b->email])->assertStatus(422);
        $this->actingAs($a)->putJson('/api/account/settings', ['settings' => ['privacy2' => false, 'is_admin' => true]])->assertOk();
        $this->assertSame(['privacy2' => false], $a->fresh()->settings);
        // Mass assignment of protected columns through the profile endpoint is ignored.
        $this->actingAs($a)->putJson('/api/account/profile', ['bio' => 'hi', 'is_demo' => true, 'email' => 'x@y.com'])->assertOk();
        $this->assertFalse($a->fresh()->is_demo);
    }

    public function test_delete_account_requires_password(): void
    {
        $a = $this->member();
        $this->actingAs($a)->deleteJson('/api/account', ['password' => 'nope-nope'])->assertStatus(422);
        $this->assertNotNull(User::find($a->id));
        $this->actingAs($a)->deleteJson('/api/account', ['password' => 'password123'])->assertOk();
        $this->assertNull(User::find($a->id));
    }

    public function test_photo_files_are_not_public_and_respect_blocks(): void
    {
        Storage::fake('local');
        $a = $this->member(); $b = $this->member();
        $this->actingAs($a)->post('/api/account/photos', ['photos' => [UploadedFile::fake()->image('a.png')]], ['Accept' => 'application/json'])->assertOk();
        $photo = Photo::where('user_id', $a->id)->firstOrFail();
        $this->app["auth"]->forgetGuards();
        $this->get("/photos/{$photo->id}")->assertRedirect();
        $this->actingAs($b)->get("/photos/{$photo->id}")->assertOk();
        $this->actingAs($a)->get("/photos/{$photo->id}")->assertOk();
        \App\Models\Block::create(['user_id' => $a->id, 'target_id' => $b->id]);
        $this->actingAs($b)->get("/photos/{$photo->id}")->assertNotFound();
        $this->assertFalse(file_exists(public_path('storage/' . $photo->path)));
    }
}
