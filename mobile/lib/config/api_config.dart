class ApiConfig {
  static String get baseUrl {
    // Production: https://vendorcenter-production.up.railway.app/api
    // Override with --dart-define=API_URL=http://10.0.2.2:4000/api for local dev
    const defaultUrl = 'https://vendorcenter-production.up.railway.app/api';
    return const String.fromEnvironment('API_URL', defaultValue: defaultUrl);
  }

  static const Duration timeout = Duration(seconds: 20);
}
