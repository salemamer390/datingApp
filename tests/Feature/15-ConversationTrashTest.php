<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationTrashTest extends TestCase
{
    use RefreshDatabase;

    private function member(array $o = []): User
    {
        static $n = 0;
        $n++;
        return User::unguarded(fn () => User::create($o + ['name' => "M$n", 'email' => "m$n@example.com", 'password' => 'password123',
            'gender' => 'woman', 'age' => 30, 'settings' => ['privacy4' => true], 'onboarding_completed_at' => now()]));
    }

    private function chat(User $a, User $b): void
    {
        $this->actingAs($a)->postJson("/api/messages/{$b->id}", ['body' => 'hi'])->assertOk();
    }

    public function test_trash_hides_and_restores_a_conversation(): void
    {
        $a = $this->member(); $b = $this->member(); $c = $this->member();
        $this->chat($a, $b); $this->chat($a, $c);

        $names = fn ($r) => collect($r->json('conversations'))->pluck('member.id');
        $this->assertCount(2, $this->actingAs($a)->getJson('/api/conversations')->json('conversations'));

        $this->actingAs($a)->postJson("/api/conversations/{$b->id}/trash")->assertOk();
        $main = $names($this->actingAs($a)->getJson('/api/conversations'));
        $this->assertNotContains($b->id, $main);
        $this->assertContains($c->id, $main);

        $trash = $names($this->actingAs($a)->getJson('/api/conversations?trash=1'));
        $this->assertContains($b->id, $trash);
        $this->assertNotContains($c->id, $trash);

        // The other member's own list is unaffected.
        $bList = $names($this->actingAs($b)->getJson('/api/conversations'));
        $this->assertContains($a->id, $bList);

        // Messages are kept while trashed and come back on restore.
        $this->assertSame(2, Message::count());
        $this->actingAs($a)->deleteJson("/api/conversations/{$b->id}/trash")->assertOk();
        $main = $names($this->actingAs($a)->getJson('/api/conversations'));
        $this->assertContains($b->id, $main);
    }

    public function test_a_new_message_brings_the_conversation_back_from_trash(): void
    {
        $a = $this->member(); $b = $this->member();
        $this->chat($a, $b);
        $this->actingAs($a)->postJson("/api/conversations/{$b->id}/trash")->assertOk();
        $this->assertCount(0, $this->actingAs($a)->getJson('/api/conversations')->json('conversations'));

        $this->actingAs($b)->postJson("/api/messages/{$a->id}", ['body' => 'you there?'])->assertOk();
        $ids = collect($this->actingAs($a)->getJson('/api/conversations')->json('conversations'))->pluck('member.id');
        $this->assertContains($b->id, $ids);
    }

    public function test_trashing_is_idempotent_and_cannot_target_self(): void
    {
        $a = $this->member(); $b = $this->member();
        $this->chat($a, $b);
        $this->actingAs($a)->postJson("/api/conversations/{$b->id}/trash")->assertOk();
        $this->actingAs($a)->postJson("/api/conversations/{$b->id}/trash")->assertOk();
        $this->assertCount(1, $this->actingAs($a)->getJson('/api/conversations?trash=1')->json('conversations'));
        $this->actingAs($a)->postJson("/api/conversations/{$a->id}/trash")->assertStatus(422);
    }
}
