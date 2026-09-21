<?php

namespace App\Actions\Riders;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateRiderAction
{
    public function handle(array $data): array
    {
        $password = Str::password(12);

        $rider = User::create([
            'name'  => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'commission_percentage' => $data['commission_percentage'] ?? null,
            'password' => $password,
            'role'  => 'rider',
        ]);


        return ['rider' => $rider, 'temporary_password' => $password];
    }
}
