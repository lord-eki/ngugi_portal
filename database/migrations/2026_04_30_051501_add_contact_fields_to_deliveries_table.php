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
            $table->string('contact_name')->nullable()->after('pin_address');
            $table->string('contact_phone')->nullable()->after('contact_name');
        });
    }

    
};
