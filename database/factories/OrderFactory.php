<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'delivery_speed' => 'standard',
            'status' => 'confirmed',
            'grand_total' => 2400,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn() => ['status' => 'pending']);
    }
    public function delivered(): static
    {
        return $this->state(fn() => ['status' => 'delivered']);
    }
}
