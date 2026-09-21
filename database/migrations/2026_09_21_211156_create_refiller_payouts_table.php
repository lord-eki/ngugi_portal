<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('refiller_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('refiller_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->decimal('percentage', 5, 2);
            $table->unsignedInteger('amount');
            $table->string('phone');
            $table->string('status')->default('processing'); 
            $table->string('originator_conversation_id')->nullable();
            $table->string('conversation_id')->nullable()->index();
            $table->string('mpesa_receipt')->nullable();
            $table->string('result_description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refiller_payouts');
    }
};
