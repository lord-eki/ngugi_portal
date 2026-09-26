<?php

namespace Database\Factories;

use App\Models\Refiller;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Refiller>
 */
class RefillerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'phone' => '2547' . fake()->numerify('########'),
            'commission_percentage' => 5,
            'is_active' => true,
        ];
    }
}
