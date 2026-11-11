<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

class OnboardingController extends Controller
{
    public function save(Request $request, int $step)
    {
        $user = $request->user();
        $rules = [
            1 => ['name' => 'required|string|max:60', 'age' => 'required|integer|between:18,100',
                'gender' => ['required', Rule::in(['man', 'woman'])], 'country' => 'required|string|max:80', 'city' => 'required|string|max:80'],
            2 => ['goal' => ['required', Rule::in(['serious', 'friendship', 'casual'])],
                'prefGender' => ['required', Rule::in(['Men', 'Women', 'Everyone'])]],
            3 => ['interests' => 'required|string|max:200'],
            4 => ['bio' => 'nullable|string|max:2000'],
        ];
        abort_unless(isset($rules[$step]), 404);
        $data = $request->validate($rules[$step]);
        $settings = $user->settings ?? [];
        if ($step === 2) {
            $settings['prefGender'] = $data['prefGender'];
            unset($data['prefGender']);
        }
        if ($step === 3) {
            $items = array_values(array_unique(array_filter(array_map('trim', explode(',', $data['interests'])))));
            Validator::make(['interests' => $items], ['interests' => 'required|array|min:1|max:12', 'interests.*' => 'required|string|max:40'])->validate();
            $data['interests'] = implode(', ', $items);
            Validator::make($data, $rules[3])->validate();
        }
        $user->fill($data);
        $user->settings = $settings;
        if ($step === 4) {
            // Validate persisted answers too. A direct request to the last step cannot bypass onboarding.
            Validator::make(array_merge($user->only(['name', 'age', 'gender', 'country', 'city', 'goal', 'interests']),
                ['prefGender' => $settings['prefGender'] ?? null]), $rules[1] + $rules[2] + $rules[3])->validate();
            $user->onboarding_completed_at = $user->onboarding_completed_at ?? now();
        }
        $user->save();
        return ['ok' => true, 'redirect' => $step === 4 ? '/discover.html' : null];
    }
}
