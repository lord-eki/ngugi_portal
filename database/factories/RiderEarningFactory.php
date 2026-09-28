<?php

namespace Database\Factories;

use App\Models\RiderEarning;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\{User,Order};

/**
 * @extends Factory<RiderEarning>
 */
class RiderEarningFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'rider_id'   => User::factory()->rider(),
            'order_id'   => Order::factory(),
            'percentage' => 10,
            'amount'     => 100,
            'status'     => 'available',
        ];
    }
}
