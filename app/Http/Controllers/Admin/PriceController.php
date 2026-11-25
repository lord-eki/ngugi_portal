<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePriceRequest;
use App\Http\Requests\UpdatePriceRequest;
use App\Models\Price;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PriceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $prices = Price::get();
        return Inertia::render('admin/prices/index',['prices' => $prices]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create() {}

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePriceRequest $request)
    {
        $price = Price::create($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Prices created for {$price->bottle_size} bottle"]);
        return back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Price $price)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Price $price)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePriceRequest $request, Price $price)
    {
        $price->update($request->validated());

        Inertia::flash('toast',['type' => 'success' , 'message' => "Price updated for bottle size {$price->bottle_size}"]);
        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Price $price)
    {
        //
    }
}
