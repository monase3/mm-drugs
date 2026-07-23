class ApiConfig {
  static String get baseUrl {
    const defined = String.fromEnvironment('BASE_URL');
    if (defined.isNotEmpty) return defined;
    return 'http://192.168.1.109:3000/api';
  }
}
