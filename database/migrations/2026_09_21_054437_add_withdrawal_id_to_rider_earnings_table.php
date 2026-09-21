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
        Schema::table('rider_earnings', function (Blueprint $table) {
            $table->foreignId('withdrawal_id')->nullable()->after('order_id')->constrained()->nullOnDelete();
        });
    }

 
};
