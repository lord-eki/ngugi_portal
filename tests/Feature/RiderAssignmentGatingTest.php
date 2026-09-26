<?php

use App\Models\{User,Order};

it('refuses to assign an offline rider', function () {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create();
    $rider = User::factory()->rider()->active()->offline()->create();

    $this->actingAs($admin)
        ->post("/admin/orders/{$order->id}/assign-rider", ['rider_id' => $rider->id])
        ->assertStatus(404); // firstOrFail() throws a 404 model-not-found

    expect($order->fresh()->delivery)->toBeNull();
});

it('refuses to assign an unverified rider', function () {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create();
    $rider = User::factory()->rider()->active()->online()->unverified()->create();

    $this->actingAs($admin)
        ->post("/admin/orders/{$order->id}/assign-rider", ['rider_id' => $rider->id])
        ->assertStatus(404);
});

it('assigns a rider who is active, online, and verified', function () {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create();
    $rider = User::factory()->rider()->active()->online()->create();

    $this->actingAs($admin)
        ->post("/admin/orders/{$order->id}/assign-rider", ['rider_id' => $rider->id])
        ->assertRedirect();

    expect($order->fresh()->delivery->rider_id)->toBe($rider->id);
});
