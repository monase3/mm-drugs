class ApiConfig {
  static String get baseUrl {
    const defined = String.fromEnvironment('BASE_URL');
    if (defined.isNotEmpty) return defined;
    return 'https://mm-drugs.vercel.app/api';
  }
}
