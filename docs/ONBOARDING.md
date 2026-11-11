# New-member profile setup

After updating the code, run `php artisan migrate --force` on the target database (back it up first). No Composer dependency changes are needed. This update does not deploy the site or configure email.

Signup keeps the member signed in and opens `onboarding.html`. Four short steps save answers to the database:

1. Display name, age 18-100, gender, country and city (required).
2. Relationship goal and who the member would like to meet (required). The seeking preference is private and editable in Preferences.
3. At least one interest (up to 12, comma-separated, 200 characters total). Suggestions are shortcuts, not forced answers.
4. Optional introduction and optional JPG/PNG/WebP profile photo (5 MB max), then Finish and discover members.

Public profile data uses the existing profile/card APIs and existing age/location privacy settings. Email, password, phone and seeking preference are not included in public member responses. No full birthday, religion, income, ethnicity or family information is collected by this setup.

The completion timestamp is written only after the server validates saved required answers. Protected pages and member/chat/notification APIs reject unfinished members. Unfinished profiles do not appear in discovery or another member's profile view. Login resumes saved answers; finishing opens Discover without a second login. Completed members are not asked again. Existing demo accounts and existing real profiles with adult age, gender, nonempty country/city and interests are marked complete by the migration; other older accounts complete the short setup once.

Members can edit their answers later using the existing profile and preference settings. Bio and photo may be skipped. Photo uploads use the existing authenticated, private-file route; no placeholder or demo photo URLs are changed.

Tests: `php artisan test`. The test configuration pins APP_URL to http://localhost so a developer's subdirectory APP_URL does not alter test request paths. The application still assumes a domain-root document root as the existing frontend/API paths do; Laravel's public directory should be the document root. Do not expose `.env` or other project files on a web server.

This is profile onboarding, not identity/age verification or full launch hardening. It does not verify email ownership, review photos or add a recommendation algorithm.
