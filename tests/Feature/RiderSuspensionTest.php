<?php

use App\Models\{Order,User,Delivery};

it('unassigns active orders when a rider is suspended', function () {
    $admin = User::factory()->admin()->create();
    $rider = User::factory()->rider()->active()->online()->create();
    $order = Order::factory()->create(['status' => 'out_for_delivery']);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $rider->id]);

    $this->actingAs($admin)->post("/admin/riders/{$rider->id}/toggle-status");

    expect($order->fresh()->delivery->rider_id)->toBeNull()
        ->and($rider->fresh()->is_active)->toBeFalse()
        ->and($rider->fresh()->is_online)->toBeFalse();
});

it('does not unassign an already-delivered order', function () {
    $admin = User::factory()->admin()->create();
    $rider = User::factory()->rider()->active()->online()->create();
    $order = Order::factory()->create(['status' => 'delivered']);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $rider->id]);

    $this->actingAs($admin)->post("/admin/riders/{$rider->id}/toggle-status");

    expect($order->fresh()->delivery->rider_id)->toBe($rider->id);
});

it('blocks a suspended rider from logging in', function () {
    $rider = User::factory()->rider()->suspended()->create(['password' => bcrypt('secret123')]);

    $this->post('/login', ['email' => $rider->email, 'password' => 'secret123'])
        ->assertSessionHasErrors();

    $this->assertGuest();
});