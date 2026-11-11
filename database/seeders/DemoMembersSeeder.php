<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * DEVELOPMENT ONLY. Ports the 3,000 fictional members that js/demo-members.js used to generate in the
 * browser, so the Discover page has data while testing. Never run this on a live site: these are fake profiles.
 * Run with: php artisan db:seed --class=DemoMembersSeeder
 */
class DemoMembersSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->error('Refusing to seed fake members in production.');
            return;
        }
        $names = [
    'Asia' => ['Aiko','Mei','Hana','Yuna','Sakura','Priya','Ananya','Mira','Arjun','Ravi','Min','Jin','Sora','Amir','Layla','Nour','Zara','Kai','Tenzin','Rina'],
    'Europe' => ['Sofia','Emma','Lucas','Oliver','Mila','Luca','Elena','Noah','Freya','Leo','Amelie','Theo','Nina','Oscar','Eva','Matteo','Clara','Adam','Isla','Hugo'],
    'Americas' => ['Olivia','Mia','Ethan','Liam','Camila','Mateo','Valentina','Daniel','Ava','Gabriel','Chloe','Logan','Isabella','Julian','Sofia','Mason','Luna','Elijah','Aria','Lucas'],
    'Africa' => ['Amara','Zola','Amina','Kofi','Nia','Tariq','Imani','Kwame','Ayana','Omar','Lerato','Thabo','Mariam','Chidi','Fatima','Jabari','Zuri','Youssef','Adaeze','Sefu']
  ];
        $locations = [
    'Asia' => [['Tokyo','Japan'],['Seoul','South Korea'],['Bangkok','Thailand'],['Mumbai','India'],['Delhi','India'],['Manila','Philippines'],['Jakarta','Indonesia'],['Singapore','Singapore'],['Hanoi','Vietnam'],['Kuala Lumpur','Malaysia'],['Taipei','Taiwan'],['Beirut','Lebanon'],['Dubai','United Arab Emirates'],['Amman','Jordan'],['Istanbul','Türkiye']],
    'Europe' => [['Paris','France'],['Berlin','Germany'],['Rome','Italy'],['Madrid','Spain'],['Amsterdam','Netherlands'],['Lisbon','Portugal'],['Stockholm','Sweden'],['Prague','Czechia'],['Athens','Greece'],['Vienna','Austria'],['Dublin','Ireland'],['Warsaw','Poland'],['Brussels','Belgium'],['Copenhagen','Denmark'],['Zurich','Switzerland']],
    'Americas' => [['New York','United States'],['Toronto','Canada'],['Los Angeles','United States'],['Mexico City','Mexico'],['São Paulo','Brazil'],['Buenos Aires','Argentina'],['Bogotá','Colombia'],['Lima','Peru'],['Vancouver','Canada'],['Miami','United States'],['Santiago','Chile'],['Montréal','Canada'],['Chicago','United States'],['Quito','Ecuador'],['San José','Costa Rica']],
    'Africa' => [['Cairo','Egypt'],['Alexandria','Egypt'],['Casablanca','Morocco'],['Tunis','Tunisia'],['Lagos','Nigeria'],['Nairobi','Kenya'],['Accra','Ghana'],['Cape Town','South Africa'],['Johannesburg','South Africa'],['Dakar','Senegal'],['Addis Ababa','Ethiopia'],['Kigali','Rwanda'],['Algiers','Algeria'],['Dar es Salaam','Tanzania'],['Kampala','Uganda']]
  ];
        $interests = ['Travel','Coffee','Books','Fitness','Cooking','Music','Movies','Nature','Art','Gaming','Photography','Hiking','Food','Languages','Beach'];
        $goals = ['serious','friendship'];
        $hash = Hash::make(bin2hex(random_bytes(16))); // unusable: nobody knows this password
        $rows = [];
        $id = 0;
        foreach (['Asia','Europe','Americas','Africa'] as $region) {
            $count = in_array($region, ['Asia','Africa']) ? 1000 : 500;
            for ($i = 0; $i < $count; $i++) {
                $id++;
                $woman = (($i * 7 + $id) % 2) === 0;
                $loc = $locations[$region][$i % count($locations[$region])];
                $n = $names[$region][$i % count($names[$region])];
                $k = intdiv($i, count($names[$region]));
                $isNew = ($i % 5 === 0);
                $rows[] = [
                    'name' => trim($n . ' ' . ($k ? $k + 1 : '')),
                    'email' => "demo{$id}@demo.invalid",
                    'password' => $hash,
                    'gender' => $woman ? 'woman' : 'man',
                    'age' => 18 + (($i * 13 + $id * 3) % 39),
                    'city' => $loc[0], 'country' => $loc[1], 'region' => $region,
                    'goal' => $goals[($i + $id) % 2],
                    'interests' => $interests[($i * 3) % count($interests)] . ',' . $interests[($i * 7 + 2) % count($interests)],
                    'photo_url' => 'https://randomuser.me/api/portraits/' . ($woman ? 'women' : 'men') . '/' . (($i % 99) + 1) . '.jpg',
                    'bio' => 'Fictional demo profile for development.',
                    'is_demo' => true,
                    'settings' => json_encode(['privacy4' => true]), // demo members accept messages from everyone
                    'created_at' => $isNew ? now()->subDays($id % 10) : now()->subDays(30 + $id % 300),
                    'updated_at' => now(),
                ];
            }
        }
        foreach (array_chunk($rows, 250) as $chunk) { DB::table('users')->insert($chunk); }
    }
}
