<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Photo extends Model
{
    protected $guarded = [];

    public function url(): string
    {
        return '/photos/' . $this->id;
    }
}
