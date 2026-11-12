<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;

class SiteControlController extends Controller
{
    public function show()
    {
        return ['registrations_open' => SiteSetting::registrationsOpen()];
    }

    public function update(Request $r)
    {
        $d = $r->validate(['registrations_open' => 'required|boolean']);
        SiteSetting::set('registrations_open', $d['registrations_open'] ? '1' : '0');
        return ['ok' => true, 'registrations_open' => SiteSetting::registrationsOpen()];
    }
}
