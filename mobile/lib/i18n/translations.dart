/// Lightweight i18n translations for mobile — matches website's EN/MR scope.
/// Usage: `context.tr('home.greeting')` or `AppLocalizations.of(context).t('key')`
const Map<String, Map<String, String>> translations = {
  'en': _en,
  'mr': _mr,
};

const _en = <String, String>{
  // ── Navigation ──
  'nav.home': 'Home',
  'nav.search': 'Search',
  'nav.bookings': 'Bookings',
  'nav.profile': 'Profile',
  'nav.explore': 'Explore',
  'nav.chat': 'AI Assistant',
  'nav.support': 'Help & Support',
  'nav.favorites': 'Saved Vendors',
  'nav.notifications': 'Notifications',

  // ── Home ──
  'home.greeting_morning': 'Good morning',
  'home.greeting_afternoon': 'Good afternoon',
  'home.greeting_evening': 'Good evening',
  'home.welcome': 'Welcome to VendorCenter',
  'home.search_hint': 'Search for electrician, plumber, salon...',
  'home.categories': 'Service Categories',
  'home.top_vendors': 'Top Vendors Near You',
  'home.see_all': 'See All',
  'home.banner_find_title': 'Find trusted service\nproviders near you',
  'home.banner_find_sub': 'Book electricians, plumbers & more',
  'home.banner_explore_title': 'Explore vendors\non the map',
  'home.banner_explore_sub': 'See who is nearby in real-time',
  'home.banner_rate_title': 'Rate & review\nyour experience',
  'home.banner_rate_sub': 'Help others find the best service',
  'home.quick_explore': 'Explore Map',
  'home.quick_ai': 'AI Assistant',
  'home.quick_bookings': 'My Bookings',
  'home.quick_support': 'Support',
  'home.stat_vendors': 'Active Vendors',
  'home.stat_customers': 'Happy Customers',
  'home.stat_jobs': 'Jobs Done',

  // ── Search ──
  'search.title': 'Search',
  'search.hint': 'Search vendors...',
  'search.no_results': 'No vendors found',
  'search.category_all': 'All',

  // ── Auth ──
  'auth.login': 'Sign In',
  'auth.logout': 'Logout',
  'auth.register': 'Sign Up',
  'auth.forgot_password': 'Forgot Password?',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.phone': 'Phone Number',
  'auth.name': 'Full Name',
  'auth.confirm_password': 'Confirm Password',
  'auth.login_email': 'Continue with Email',
  'auth.login_phone': 'Continue with Phone',
  'auth.or': 'or',
  'auth.no_account': "Don't have an account?",
  'auth.has_account': 'Already have an account?',
  'auth.terms_agree': 'I agree to the Terms of Service and Privacy Policy',
  'auth.logout_confirm': 'Are you sure you want to sign out?',
  'auth.cancel': 'Cancel',

  // ── Bookings ──
  'bookings.title': 'My Bookings',
  'bookings.active': 'Active',
  'bookings.completed': 'Completed',
  'bookings.cancelled': 'Cancelled',
  'bookings.empty': 'No bookings yet',
  'bookings.book_now': 'Book Now',
  'bookings.sign_in_to_view': 'Sign in to view your bookings',

  // ── Vendor ──
  'vendor.services': 'Services',
  'vendor.reviews': 'Reviews',
  'vendor.verified': 'Verified',
  'vendor.not_found': 'Vendor not found',
  'vendor.review_count': '{{count}} reviews',

  // ── Profile ──
  'profile.title': 'Profile',
  'profile.sign_in_to_view': 'Sign in to view your profile',
  'profile.edit': 'Edit Profile',
  'profile.saved_vendors': 'Saved Vendors',
  'profile.theme': 'Dark Mode',
  'profile.language': 'Language',

  // ── Common ──
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Retry',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.submit': 'Submit',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.ok': 'OK',

  // ── Status ──
  'status.pending': 'Pending',
  'status.confirmed': 'Confirmed',
  'status.in_progress': 'In Progress',
  'status.completed': 'Completed',
  'status.cancelled': 'Cancelled',
  'status.rejected': 'Rejected',

  // ── Notifications ──
  'notif.title': 'Notifications',
  'notif.empty': 'No notifications yet',

  // ── Explore ──
  'explore.title': 'Explore Nearby',
  'explore.search_hint': 'Search vendors on map...',
  'explore.radius': 'Radius',
  'explore.all_categories': 'All',
  'explore.no_vendors': 'No vendors found in this area',
};

const _mr = <String, String>{
  // ── नेव्हिगेशन ──
  'nav.home': 'मुख्यपृष्ठ',
  'nav.search': 'शोधा',
  'nav.bookings': 'बुकिंग',
  'nav.profile': 'प्रोफाइल',
  'nav.explore': 'शोधा',
  'nav.chat': 'AI सहाय्यक',
  'nav.support': 'मदत आणि सहाय्य',
  'nav.favorites': 'सेव्ह केलेले विक्रेते',
  'nav.notifications': 'सूचना',

  // ── मुख्यपृष्ठ ──
  'home.greeting_morning': 'सुप्रभात',
  'home.greeting_afternoon': 'शुभ दुपार',
  'home.greeting_evening': 'शुभ संध्याकाळ',
  'home.welcome': 'VendorCenter मध्ये आपले स्वागत',
  'home.search_hint': 'इलेक्ट्रिशियन, प्लंबर, सलून शोधा...',
  'home.categories': 'सेवा श्रेण्या',
  'home.top_vendors': 'तुमच्या जवळचे शीर्ष विक्रेते',
  'home.see_all': 'सर्व पहा',
  'home.banner_find_title': 'तुमच्या जवळचे विश्वसनीय\nसेवा प्रदाता शोधा',
  'home.banner_find_sub': 'इलेक्ट्रिशियन, प्लंबर आणि बरेच काही बुक करा',
  'home.banner_explore_title': 'नकाशावर विक्रेते\nशोधा',
  'home.banner_explore_sub': 'जवळपासचे विक्रेते रिअल-टाइममध्ये पहा',
  'home.banner_rate_title': 'तुमचा अनुभव\nरेट करा आणि रिव्यू द्या',
  'home.banner_rate_sub': 'इतरांना सर्वोत्तम सेवा शोधण्यात मदत करा',
  'home.quick_explore': 'नकाशा एक्सप्लोर करा',
  'home.quick_ai': 'AI सहाय्यक',
  'home.quick_bookings': 'माझे बुकिंग',
  'home.quick_support': 'सहाय्य',
  'home.stat_vendors': 'सक्रिय विक्रेते',
  'home.stat_customers': 'आनंदी ग्राहक',
  'home.stat_jobs': 'पूर्ण झालेली कामे',

  // ── शोध ──
  'search.title': 'शोधा',
  'search.hint': 'विक्रेते शोधा...',
  'search.no_results': 'कोणतेही विक्रेते सापडले नाहीत',
  'search.category_all': 'सर्व',

  // ── ऑथ ──
  'auth.login': 'साइन इन',
  'auth.logout': 'लॉगआउट',
  'auth.register': 'साइन अप',
  'auth.forgot_password': 'पासवर्ड विसरलात?',
  'auth.email': 'ईमेल',
  'auth.password': 'पासवर्ड',
  'auth.phone': 'फोन नंबर',
  'auth.name': 'पूर्ण नाव',
  'auth.confirm_password': 'पासवर्ड पुष्टी करा',
  'auth.login_email': 'ईमेलने सुरू ठेवा',
  'auth.login_phone': 'फोनने सुरू ठेवा',
  'auth.or': 'किंवा',
  'auth.no_account': 'खाते नाही?',
  'auth.has_account': 'आधीच खाते आहे?',
  'auth.terms_agree': 'मी सेवा अटी आणि गोपनीयता धोरण मान्य करतो',
  'auth.logout_confirm': 'तुम्हाला नक्की साइन आउट करायचे आहे?',
  'auth.cancel': 'रद्द करा',

  // ── बुकिंग ──
  'bookings.title': 'माझे बुकिंग',
  'bookings.active': 'सक्रिय',
  'bookings.completed': 'पूर्ण',
  'bookings.cancelled': 'रद्द',
  'bookings.empty': 'अद्याप कोणतेही बुकिंग नाही',
  'bookings.book_now': 'आता बुक करा',
  'bookings.sign_in_to_view': 'तुमचे बुकिंग पाहण्यासाठी साइन इन करा',

  // ── विक्रेता ──
  'vendor.services': 'सेवा',
  'vendor.reviews': 'पुनरावलोकने',
  'vendor.verified': 'सत्यापित',
  'vendor.not_found': 'विक्रेता सापडला नाही',
  'vendor.review_count': '{{count}} पुनरावलोकने',

  // ── प्रोफाइल ──
  'profile.title': 'प्रोफाइल',
  'profile.sign_in_to_view': 'तुमचा प्रोफाइल पाहण्यासाठी साइन इन करा',
  'profile.edit': 'प्रोफाइल संपादित करा',
  'profile.saved_vendors': 'सेव्ह केलेले विक्रेते',
  'profile.theme': 'डार्क मोड',
  'profile.language': 'भाषा',

  // ── सामान्य ──
  'common.loading': 'लोड होत आहे...',
  'common.error': 'काहीतरी चूक झाली',
  'common.retry': 'पुन्हा प्रयत्न करा',
  'common.save': 'जतन करा',
  'common.cancel': 'रद्द करा',
  'common.delete': 'हटवा',
  'common.edit': 'संपादित करा',
  'common.submit': 'सबमिट करा',
  'common.back': 'मागे',
  'common.next': 'पुढे',
  'common.done': 'पूर्ण',
  'common.close': 'बंद करा',
  'common.yes': 'होय',
  'common.no': 'नाही',
  'common.ok': 'ठीक आहे',

  // ── स्थिती ──
  'status.pending': 'प्रलंबित',
  'status.confirmed': 'पुष्टी केली',
  'status.in_progress': 'प्रगतीत',
  'status.completed': 'पूर्ण',
  'status.cancelled': 'रद्द',
  'status.rejected': 'नाकारले',

  // ── सूचना ──
  'notif.title': 'सूचना',
  'notif.empty': 'अद्याप कोणत्याही सूचना नाहीत',

  // ── एक्सप्लोर ──
  'explore.title': 'जवळपास शोधा',
  'explore.search_hint': 'नकाशावर विक्रेते शोधा...',
  'explore.radius': 'त्रिज्या',
  'explore.all_categories': 'सर्व',
  'explore.no_vendors': 'या भागात कोणतेही विक्रेते सापडले नाहीत',
};
