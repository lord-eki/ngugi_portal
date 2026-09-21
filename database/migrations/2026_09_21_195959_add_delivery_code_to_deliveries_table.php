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
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('delivery_code', 6)->nullable()->after('assigned_at');
            $table->timestamp('delivery_code_verified_at')->nullable();
        });
    }

  
};
