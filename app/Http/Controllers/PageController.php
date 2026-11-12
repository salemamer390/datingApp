<?php

namespace App\Http\Controllers;

use App\Support\Lc;
use Illuminate\Http\Request;

/**
 * Serves the original LoveConnect HTML files unchanged. Only two things are added per response:
 * a tiny bootstrap <script> (server session state + CSRF) and /js/backend.js, which wires the
 * existing UI to the API. No markup, class or style is altered.
 */
class PageController extends Controller
{
    private const PROTECTED = ['discover', 'search', 'member', 'likes', 'messages', 'notifications', 'chat', 'settings', 'settings-profile', 'settings-photos', 'settings-privacy', 'settings-notifications', 'settings-preferences', 'settings-blocked', 'my-profile', 'view-profile', 'favorites', 'profile-views', 'blocked', 'onboarding'];

    public function show(Request $request, string $page = 'index')
    {
        $file = resource_path("frontend/{$page}.html");
        if (! preg_match('/^[a-z-]+$/', $page) || ! is_file($file)) {
            abort(404);
        }
        $user = $request->user();
        // The admin area is separate from the member pages, with its own sign-in page:
        // guests are sent there, ordinary members get a plain 404 (it is not part of their site).
        if ($page === 'admin') {
            if (! $user) {
                return redirect('/admin-login.html');
            }
            abort_unless($user->is_admin, 404);
        }
        // Already signed in as an admin: the sign-in page hands over to the dashboard.
        if ($page === 'admin-login' && $user && $user->is_admin) {
            return redirect('/admin.html');
        }
        if ($user && $user->isSuspended() && $page !== 'admin') {
            return redirect('/index.html?suspended=1');
        }
        if (in_array($page, self::PROTECTED, true) && ! $user) {
            return redirect('/index.html?loginRequired=1');
        }
        if ($user && $page !== 'onboarding' && in_array($page, self::PROTECTED, true) && ! $user->hasCompletedOnboarding()) {
            return redirect('/onboarding.html');
        }
        if ($user && $page === 'onboarding' && $user->hasCompletedOnboarding()) {
            return redirect('/discover.html');
        }
        $html = file_get_contents($file);
        $boot = [
            'csrf' => csrf_token(),
            'me' => $user ? Lc::me($user->load('photos')) : null,
        ];
        $json = json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        $head = '<script>window.LC=' . $json . ';(function(){try{var m=LC.me,s=sessionStorage;'
            . 'if(m){s.setItem("loveconnect_signed_in","yes");s.setItem("loveconnect_profile_name",m.name);'
            . 'm.photo?s.setItem("loveconnect_profile_photo",m.photo):s.removeItem("loveconnect_profile_photo");'
            . 's.setItem("loveconnect_profile",JSON.stringify(m.profile));s.setItem("loveconnect_profile_photos",JSON.stringify(m.photos));}'
            . 'else{["loveconnect_signed_in","loveconnect_profile_name","loveconnect_profile_photo","loveconnect_profile","loveconnect_profile_photos"].forEach(function(k){s.removeItem(k)});}'
            . 'var l=localStorage,uid=m?String(m.id):"";if(l.getItem("lc_uid")!==uid){Object.keys(l).filter(function(k){return /^lc_setting_|^loveconnect_profile/.test(k)}).forEach(function(k){l.removeItem(k)});l.setItem("lc_uid",uid);}'
            . '}catch(e){}})();</script>';
        $html = preg_replace('/<head[^>]*>/i', '$0' . $head, $html, 1);
        $html = preg_replace('#</body>#i', '<script src="/js/i18n.js"></script><script src="/js/backend.js"></script></body>', $html, 1);
        return response($html)->header('Content-Type', 'text/html; charset=UTF-8')->header('Cache-Control', 'no-store');
    }
}
