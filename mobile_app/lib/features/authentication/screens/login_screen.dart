import 'package:flutter/material.dart';
import '../../../core/config/api_config.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';
import '../../../widgets/app_logo.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  
  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  final _nameFocusNode = FocusNode();
  final _phoneFocusNode = FocusNode();

  final _authService = AuthService();

  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _isRegisterMode = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    _nameFocusNode.dispose();
    _phoneFocusNode.dispose();
    super.dispose();
  }

  void _showSettingsDialog() {
    final controller = TextEditingController(text: ApiConfig.baseUrl);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.dns_outlined, color: AppColors.navy700),
              SizedBox(width: 10),
              Text(
                'Server Address',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Configure the MERN API Base URL for this physical device to reach the backend:',
                style: TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                autofocus: true,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  hintText: 'http://192.168.x.x:5000/api/v1',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: AppColors.slate500)),
            ),
            ElevatedButton(
              onPressed: () async {
                var url = controller.text.trim();
                if (url.isNotEmpty) {
                  // Ensure http:// or https:// scheme prefix
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'http://$url';
                  }

                  // Auto-append default port 5000 if no port is specified
                  final hostPart = url.replaceFirst('http://', '').replaceFirst('https://', '');
                  final hasPort = RegExp(r':\d+').hasMatch(hostPart.split('/').first);
                  if (!hasPort) {
                    if (url.contains('/api/v1')) {
                      url = url.replaceFirst('/api/v1', ':5000/api/v1');
                    } else {
                      url = '$url:5000';
                    }
                  }

                  // Auto-append /api/v1 if not specified
                  if (!url.endsWith('/api/v1') && !url.endsWith('/api/v1/')) {
                    if (url.endsWith('/')) {
                      url = '${url}api/v1';
                    } else {
                      url = '$url/api/v1';
                    }
                  }

                  final navigator = Navigator.of(context);
                  final messenger = ScaffoldMessenger.of(context);
                  await ApiConfig.setBaseUrl(url);
                  navigator.pop();
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text('Server URL updated to: $url'),
                      backgroundColor: AppColors.navy700,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Save URL', style: TextStyle(fontSize: 12, color: AppColors.white)),
            ),
          ],
        );
      },
    );
  }

  void _handleSubmit() {
    if (_isRegisterMode) {
      _handleRegister();
    } else {
      _handleLogin();
    }
  }

  void _handleRegister() async {
    setState(() {
      _errorMessage = null;
    });

    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      final name = _nameController.text.trim();
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final phone = _phoneController.text.trim();

      // Pre-set session with user's registered name, email, and phone
      AuthService.setRegisteredSession(
        name: name,
        email: email,
        phone: phone,
        role: 'patient',
      );

      try {
        final role = await _authService.register(name, email, password, phone);

        if (!mounted) return;

        setState(() {
          _isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registration successful! Logging in...'),
            backgroundColor: AppColors.emerald600,
          ),
        );

        if (role == 'patient' || role == null) {
          Navigator.pushReplacementNamed(context, AppRoutes.patientDashboard);
        } else {
          setState(() {
            _errorMessage = 'Registered successfully, but role "$role" is not recognized.';
          });
        }
      } catch (e) {
        if (!mounted) return;

        // If backend server is offline, allow local demo login for the newly registered user profile
        if (e.toString().contains('Unable to connect') || e.toString().contains('timed out')) {
          setState(() {
            _isLoading = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Registered profile locally. Navigating to Dashboard...'),
              backgroundColor: AppColors.emerald600,
            ),
          );
          Navigator.pushReplacementNamed(context, AppRoutes.patientDashboard);
          return;
        }

        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  void _handleLogin() async {
    setState(() {
      _errorMessage = null;
    });

    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      final email = _emailController.text.trim();
      final password = _passwordController.text;

      try {
        final role = await _authService.authenticate(email, password);

        if (!mounted) return;

        setState(() {
          _isLoading = false;
        });

        // Map roles returned from MERN database to the correct mobile dashboards
        if (role == 'super_admin' || role == 'hospital_admin') {
          Navigator.pushReplacementNamed(context, AppRoutes.adminDashboard);
        } else if (role == 'doctor') {
          Navigator.pushReplacementNamed(context, AppRoutes.doctorDashboard);
        } else if (role == 'nurse') {
          Navigator.pushReplacementNamed(context, AppRoutes.nurseDashboard);
        } else if (role == 'patient') {
          Navigator.pushReplacementNamed(context, AppRoutes.patientDashboard);
        } else {
          // If the role is registered in database but not yet supported on mobile
          setState(() {
            _errorMessage = 'The "$role" dashboard is not yet supported in this mobile client.';
          });
        }
      } catch (e) {
        if (!mounted) return;
        setState(() {
          _isLoading = false;
          // Extract message from exception
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);
    
    return Scaffold(
      backgroundColor: AppColors.slate50,
      body: SafeArea(
        child: Stack(
          children: [
            GestureDetector(
              onTap: () => FocusScope.of(context).unfocus(),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.fromLTRB(
                  responsive.scaleWidth(24.0),
                  responsive.scaleHeight(12.0),
                  responsive.scaleWidth(24.0),
                  responsive.scaleHeight(20.0),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(height: responsive.scaleHeight(24.0)),
                    
                    // Top logo and branding block (Matches small-screen web header)
                    Center(
                      child: Column(
                        children: [
                          AppLogo(size: responsive.scaleWidth(64.0)),
                          SizedBox(height: responsive.scaleHeight(16.0)),
                          Text(
                            'HMS Enterprise',
                            style: TextStyle(
                              fontSize: responsive.scaleText(22.0),
                              fontWeight: FontWeight.w800,
                              color: AppColors.navy900,
                              letterSpacing: -0.5,
                            ),
                          ),
                          SizedBox(height: responsive.scaleHeight(16.0)),
                          Text(
                            _isRegisterMode ? 'Patient Registration' : 'Sign In to Dashboard',
                            style: TextStyle(
                              fontSize: responsive.scaleText(18.0),
                              fontWeight: FontWeight.w800,
                              color: AppColors.slate900,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _isRegisterMode
                                ? 'Create a patient account to access personal health records.'
                                : 'Enter your credentials registered by the Super Administrator.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: responsive.scaleText(12.0),
                              color: AppColors.slate500,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    SizedBox(height: responsive.scaleHeight(28.0)),
                    
                    // Form Card
                    Container(
                      padding: EdgeInsets.all(responsive.scaleWidth(24.0)),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(16.0),
                        border: Border.all(
                          color: AppColors.slate200,
                          width: 1.0,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.slate900.withOpacity(0.04),
                            blurRadius: 20.0,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Full Name Field (Visible in Register Mode only)
                            if (_isRegisterMode) ...[
                              Text(
                                'Full Name',
                                style: TextStyle(
                                  fontSize: responsive.scaleText(12.0),
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.slate700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _nameController,
                                focusNode: _nameFocusNode,
                                keyboardType: TextInputType.name,
                                textInputAction: TextInputAction.next,
                                style: TextStyle(
                                  fontSize: responsive.scaleText(14.0),
                                  color: AppColors.slate900,
                                  fontWeight: FontWeight.w500,
                                ),
                                decoration: const InputDecoration(
                                  hintText: 'John Doe',
                                ),
                                validator: (value) {
                                  if (_isRegisterMode) {
                                    if (value == null || value.trim().isEmpty) {
                                      return 'Full name is required';
                                    }
                                    if (value.trim().length < 2) {
                                      return 'Name must be at least 2 characters';
                                    }
                                  }
                                  return null;
                                },
                                onFieldSubmitted: (_) {
                                  FocusScope.of(context).requestFocus(_emailFocusNode);
                                },
                              ),
                              SizedBox(height: responsive.scaleHeight(20.0)),
                            ],

                            // Email Field
                            Text(
                              _isRegisterMode ? 'Email Address' : 'Administrator / Staff Email',
                              style: TextStyle(
                                fontSize: responsive.scaleText(12.0),
                                fontWeight: FontWeight.bold,
                                color: AppColors.slate700,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _emailController,
                              focusNode: _emailFocusNode,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              style: TextStyle(
                                fontSize: responsive.scaleText(14.0),
                                color: AppColors.slate900,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: const InputDecoration(
                                  hintText: 'name@hospital.com',
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Email is required';
                                }
                                final emailRegExp = RegExp(
                                    r"^[a-zA-Z0-9.a-zA-Z0-9.!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9]+\.[a-zA-Z]+");
                                if (!emailRegExp.hasMatch(value.trim())) {
                                  return 'Please enter a valid email address';
                                }
                                return null;
                              },
                              onFieldSubmitted: (_) {
                                if (_isRegisterMode) {
                                  FocusScope.of(context).requestFocus(_phoneFocusNode);
                                } else {
                                  FocusScope.of(context).requestFocus(_passwordFocusNode);
                                }
                              },
                            ),
                            
                            SizedBox(height: responsive.scaleHeight(20.0)),

                            // Phone Field (Visible in Register Mode only)
                            if (_isRegisterMode) ...[
                              Text(
                                'Phone Number',
                                style: TextStyle(
                                  fontSize: responsive.scaleText(12.0),
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.slate700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _phoneController,
                                focusNode: _phoneFocusNode,
                                keyboardType: TextInputType.phone,
                                textInputAction: TextInputAction.next,
                                style: TextStyle(
                                  fontSize: responsive.scaleText(14.0),
                                  color: AppColors.slate900,
                                  fontWeight: FontWeight.w500,
                                ),
                                decoration: const InputDecoration(
                                  hintText: '+1 234 567 8900',
                                ),
                                validator: (value) {
                                  if (_isRegisterMode) {
                                    if (value == null || value.trim().isEmpty) {
                                      return 'Phone number is required';
                                    }
                                  }
                                  return null;
                                },
                                onFieldSubmitted: (_) {
                                  FocusScope.of(context).requestFocus(_passwordFocusNode);
                                },
                              ),
                              SizedBox(height: responsive.scaleHeight(20.0)),
                            ],
                            
                            // Password Field Label
                            Text(
                              'Security Password',
                              style: TextStyle(
                                fontSize: responsive.scaleText(12.0),
                                fontWeight: FontWeight.bold,
                                color: AppColors.slate700,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _passwordController,
                              focusNode: _passwordFocusNode,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              style: TextStyle(
                                fontSize: responsive.scaleText(14.0),
                                color: AppColors.slate900,
                                fontWeight: FontWeight.w500,
                               ),
                              decoration: InputDecoration(
                                hintText: '••••••••',
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                    color: AppColors.slate400,
                                    size: 20,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Password is required';
                                }
                                if (_isRegisterMode && value.length < 6) {
                                  return 'Password must be at least 6 characters';
                                }
                                return null;
                              },
                              onFieldSubmitted: (_) => _handleSubmit(),
                            ),
                            
                            // Validation error block
                            if (_errorMessage != null) ...[
                              SizedBox(height: responsive.scaleHeight(16.0)),
                              Container(
                                padding: const EdgeInsets.all(12.0),
                                decoration: BoxDecoration(
                                  color: AppColors.errorBg,
                                  border: Border.all(color: AppColors.errorBorder),
                                  borderRadius: BorderRadius.circular(8.0),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline, color: AppColors.errorRed, size: 16),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style: TextStyle(
                                          color: AppColors.errorRed,
                                          fontSize: responsive.scaleText(11.0),
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            
                            SizedBox(height: responsive.scaleHeight(24.0)),
                            
                            // Action Button
                            ElevatedButton(
                              onPressed: _isLoading ? null : _handleSubmit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.navy700,
                                padding: const EdgeInsets.symmetric(vertical: 15.0),
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.0,
                                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.white),
                                      ),
                                    )
                                  : Text(
                                      _isRegisterMode ? 'Register Account' : 'Secure Sign In',
                                      style: TextStyle(
                                        fontSize: responsive.scaleText(14.0),
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                            ),
                            
                            const SizedBox(height: 16),
                            
                            // Toggle Mode Link
                            Center(
                              child: TextButton(
                                onPressed: () {
                                  setState(() {
                                    _isRegisterMode = !_isRegisterMode;
                                    _errorMessage = null;
                                  });
                                },
                                child: Text(
                                  _isRegisterMode
                                      ? 'Already have an account? Sign In'
                                      : 'Are you a patient? Create an account',
                                  style: TextStyle(
                                    color: AppColors.navy700,
                                    fontSize: responsive.scaleText(12.5),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    SizedBox(height: responsive.scaleHeight(24.0)),
                    
                    // Connection Info Banner
                    Container(
                      padding: const EdgeInsets.all(16.0),
                      decoration: BoxDecoration(
                        color: AppColors.navy50,
                        borderRadius: BorderRadius.circular(12.0),
                        border: Border.all(color: AppColors.navy100),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.wifi_tethering, color: AppColors.navy700, size: 16),
                              SizedBox(width: 8),
                              Text(
                                'Physical Device Connection Settings',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.navy800,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isRegisterMode
                                ? '1. Ensure your PC and this phone are on the same Wi-Fi network.\n'
                                  '2. Fill in your details to create a patient profile in the backend.\n'
                                  '3. After registration, you will be automatically logged in to your portal.'
                                : '1. Ensure your PC and this phone are on the same Wi-Fi network.\n'
                                  '2. Tap the settings gear icon in the top right to configure your PC\'s local IP address.\n'
                                  '3. Use credentials registered in your database (e.g. superadmin@hms.com / admin123).',
                            style: TextStyle(
                              fontSize: responsive.scaleText(10.5),
                              color: AppColors.navy900,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    SizedBox(height: responsive.scaleHeight(20.0)),
                  ],
                ),
              ),
            ),

            // Settings/Gear Icon positioned at top right (painted on top to receive touch events)
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(Icons.settings_outlined, color: AppColors.slate500, size: 24),
                onPressed: _showSettingsDialog,
                tooltip: 'Server Settings',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
