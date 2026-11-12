<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect('/index.html'));
Route::get('/photos/{photo}', [AccountController::class, 'showPhoto'])->middleware('auth')->whereNumber('photo');
Route::get('/{page}.html', [PageController::class, 'show'])->where('page', '[a-z-]+');

Route::prefix('api')->group(function () {
    Route::post('signup', [AuthController::class, 'signup'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware(['auth', App\Http\Middleware\Seen::class])->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::put('onboarding/{step}', [\App\Http\Controllers\OnboardingController::class, 'save'])->whereNumber('step');

        Route::middleware(\App\Http\Middleware\EnsureProfileComplete::class)->group(function () {
            Route::get('members', [MemberController::class, 'index']);
            Route::get('members/{user}', [MemberController::class, 'show']);
            Route::post('members/{user}/like', [MemberController::class, 'like']);
            Route::post('members/{user}/favorite', [MemberController::class, 'favorite']);
            Route::post('members/{user}/block', [MemberController::class, 'block']);
            Route::delete('members/{user}/block', [MemberController::class, 'unblock']);
            Route::post('members/{user}/report', [MemberController::class, 'report'])->middleware('throttle:20,1');
            Route::get('activity/{kind}', [ActivityController::class, 'show']);
            Route::get('conversations', [MessageController::class, 'conversations']);
            Route::post('conversations/{user}/trash', [MessageController::class, 'trash']);
            Route::delete('conversations/{user}/trash', [MessageController::class, 'restore']);
            Route::get('messages/{user}', [MessageController::class, 'thread']);
            Route::post('messages/{user}', [MessageController::class, 'send'])->middleware('throttle:60,1');
            Route::get('notifications', [NotificationController::class, 'index']);
            Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
            Route::post('notifications/{id}/read', [NotificationController::class, 'read']);
        });
        // Admin dashboard: real data and actions for site management. Not behind EnsureProfileComplete:
        // an admin account is for managing the site, not for dating, so onboarding is not required.
        Route::middleware(App\Http\Middleware\EnsureAdmin::class)->prefix('admin')->name('admin.')->group(function () {
            Route::get('overview', [App\Http\Controllers\Admin\DashboardController::class, 'overview']);
            Route::get('reports', [App\Http\Controllers\Admin\ReportController::class, 'index']);
            Route::put('reports/{report}', [App\Http\Controllers\Admin\ReportController::class, 'update'])->whereNumber('report');
            Route::get('members', [App\Http\Controllers\Admin\MemberController::class, 'index']);
            Route::get('members/{user}', [App\Http\Controllers\Admin\MemberController::class, 'show'])->whereNumber('user');
            Route::put('members/{user}/suspend', [App\Http\Controllers\Admin\MemberController::class, 'suspend'])->whereNumber('user');
            Route::delete('members/{user}/suspend', [App\Http\Controllers\Admin\MemberController::class, 'unsuspend'])->whereNumber('user');
            Route::get('site-controls', [App\Http\Controllers\Admin\SiteControlController::class, 'show']);
            Route::put('site-controls', [App\Http\Controllers\Admin\SiteControlController::class, 'update']);
            Route::get('system', [App\Http\Controllers\Admin\SystemController::class, 'show']);
            Route::get('announcements', [App\Http\Controllers\Admin\AnnouncementController::class, 'index']);
            Route::get('announcements/audience', [App\Http\Controllers\Admin\AnnouncementController::class, 'audience']);
            Route::post('announcements', [App\Http\Controllers\Admin\AnnouncementController::class, 'store']);
        });
        Route::put('account/profile', [AccountController::class, 'profile']);
        Route::put('account/settings', [AccountController::class, 'settings']);
        Route::post('account/photos', [AccountController::class, 'uploadPhotos']);
        Route::delete('account/photos/{photo}', [AccountController::class, 'deletePhoto']);
        Route::delete('account', [AccountController::class, 'destroy']);
    });
});
