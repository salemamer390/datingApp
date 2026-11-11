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
        Route::get('members', [MemberController::class, 'index']);
        Route::get('members/{user}', [MemberController::class, 'show']);
        Route::post('members/{user}/like', [MemberController::class, 'like']);
        Route::post('members/{user}/favorite', [MemberController::class, 'favorite']);
        Route::post('members/{user}/block', [MemberController::class, 'block']);
        Route::delete('members/{user}/block', [MemberController::class, 'unblock']);
        Route::post('members/{user}/report', [MemberController::class, 'report'])->middleware('throttle:20,1');
        Route::get('activity/{kind}', [ActivityController::class, 'show']);
        Route::get('conversations', [MessageController::class, 'conversations']);
        Route::get('messages/{user}', [MessageController::class, 'thread']);
        Route::post('messages/{user}', [MessageController::class, 'send'])->middleware('throttle:60,1');
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'read']);
        Route::put('account/profile', [AccountController::class, 'profile']);
        Route::put('account/settings', [AccountController::class, 'settings']);
        Route::post('account/photos', [AccountController::class, 'uploadPhotos']);
        Route::delete('account/photos/{photo}', [AccountController::class, 'deletePhoto']);
        Route::delete('account', [AccountController::class, 'destroy']);
    });
});
