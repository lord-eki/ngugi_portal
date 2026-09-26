<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => 'customer',
            'is_active' => true
        ];
    }


    public function admin(): static
    {
        return $this->state(fn() => ['role' => 'admin']);
    }

    public function rider(): static
    {
        return $this->state(fn() => [
            'role' => 'rider',
            'phone' => '2547' . fake()->numerify('########'),
            'national_id' => fake()->numerify('########'),
            'payout_method' => 'mpesa',
            'transport_type' => 'bike',
            'commission_percentage' => 10
        ]);
    }


    public function active(): static
    {
        return $this->state(fn() => ['is_active' => true]);
    }
    public function suspended(): static
    {
        return $this->state(fn() => ['is_active' => false]);
    }
    public function online(): static
    {
        return $this->state(fn() => ['is_online' => true]);
    }
    public function offline(): static
    {
        return $this->state(fn() => ['is_online' => false]);
    }
    public function unverified(): static
    {
        return $this->state(fn() => ['email_verified_at' => null]);
    }
}
