<?php

namespace Tests\Feature;

use App\Models\Photo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubfolderAndSearchRemovalTest extends TestCase
{
    use RefreshDatabase;

    private function member(): User
    {
        $u = User::create(['name' => 'Real Member', 'email' => 'real@example.com', 'password' => 'password123', 'age' => 30, 'gender' => 'woman',
            'country' => 'Egypt', 'city' => 'Cairo', 'goal' => 'serious', 'interests' => 'Travel']);
        $u->forceFill(['onboarding_completed_at' => now()])->save();
        return $u;
    }

    public function test_search_page_is_gone(): void
    {
        $this->actingAs($this->member())->get('/search.html')->assertNotFound();
        $this->assertFileDoesNotExist(resource_path('frontend/search.html'));
    }

    public function test_photo_urls_are_relative_so_they_work_from_a_subfolder(): void
    {
        $u = $this->member();
        $photo = Photo::create(['user_id' => $u->id, 'path' => 'photos/x.png', 'position' => 0]);
        $this->assertSame('photos/' . $photo->id, $photo->url());
    }

    public function test_members_without_region_or_hidden_location_return_nulls_the_discover_cards_handle(): void
    {
        $viewer = $this->member();
        $other = User::create(['name' => 'No Region', 'email' => 'n@example.com', 'password' => 'password123', 'age' => 31, 'gender' => 'man',
            'country' => 'Egypt', 'city' => 'Cairo', 'goal' => 'friendship', 'interests' => 'Music', 'settings' => ['privacy3' => false]]);
        $other->forceFill(['onboarding_completed_at' => now()])->save();
        $res = $this->actingAs($viewer)->getJson('/api/members')->assertOk();
        $row = collect($res->json('data'))->firstWhere('id', $other->id);
        $this->assertNull($row['region']);
        $this->assertNull($row['country']);
        // The Discover script must null-guard these fields instead of calling toLowerCase() on them.
        $js = file_get_contents(public_path('js/demo-members.js'));
        $this->assertStringContainsString("(m.country||'').toLowerCase()", $js);
        $this->assertStringContainsString("(m.region||'').toLowerCase()", $js);
    }

    public function test_front_end_scripts_keep_api_calls_relative(): void
    {
        foreach (['demo-members.js', 'admin.js'] as $file) {
            $js = file_get_contents(public_path('js/' . $file));
            $this->assertStringContainsString('localUrl', $js, $file);
        }
        $login = file_get_contents(resource_path('frontend/admin-login.html'));
        $this->assertStringContainsString("fetch('api/admin-login'", $login);
        $this->assertStringNotContainsString("fetch('/api/", $login);
        $this->assertStringNotContainsString("'/admin-login.html'", file_get_contents(public_path('js/admin.js')));
    }

    public function test_footer_privacy_link_has_a_fallback_on_pages_without_the_modal(): void
    {
        $js = file_get_contents(public_path('js/layout.js'));
        $this->assertStringContainsString("index.html?privacy=1", $js);
    }
}
