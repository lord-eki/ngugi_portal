<?php

namespace Database\Factories;

use App\Models\Delivery;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Delivery>
 */
class DeliveryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'location_mode' => 'manual',
            'manual_address' => fake()->streetAddress(),
            'schedule_type' => 'asap',
            'contact_email' => fake()->safeEmail(),
            'contact_phone' => '2547' . fake()->numerify('########'),
        ];
    }
}
