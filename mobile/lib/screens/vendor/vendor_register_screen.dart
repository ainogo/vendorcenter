import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';

class VendorRegisterScreen extends StatefulWidget {
  const VendorRegisterScreen({super.key});

  @override
  State<VendorRegisterScreen> createState() => _VendorRegisterScreenState();
}

class _VendorRegisterScreenState extends State<VendorRegisterScreen> {
  final _api = ApiService();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _businessCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();

  final _otpCtrl = TextEditingController();

  int _step = 0; // 0=form, 1=otp
  bool _loading = false;
  String? _error;
  String? _otpId;
  bool _obscurePass = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _businessCtrl.dispose();
    _passCtrl.dispose();
    _confirmPassCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  static final _passwordRegex = RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$');

  String? _validateForm() {
    if (_nameCtrl.text.trim().isEmpty) return 'Name is required';
    if (_emailCtrl.text.trim().isEmpty) return 'Email is required';
    if (!_emailCtrl.text.trim().contains('@')) return 'Enter a valid email';
    if (_passCtrl.text.length < 8) return 'Password must be at least 8 characters';
    if (!_passwordRegex.hasMatch(_passCtrl.text)) {
      return 'Password must include uppercase, lowercase, number, and special character';
    }
    if (_passCtrl.text != _confirmPassCtrl.text) return 'Passwords do not match';
    if (_phoneCtrl.text.trim().isNotEmpty && _phoneCtrl.text.trim().length != 10) {
      return 'Phone must be 10 digits';
    }
    return null;
  }

  Future<void> _submitForm() async {
    final err = _validateForm();
    if (err != null) {
      setState(() => _error = err);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await _api.signup(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        phone: _phoneCtrl.text.trim(),
        role: 'vendor',
        businessName: _businessCtrl.text.trim(),
      );
      if (res['success'] != true) {
        setState(() { _loading = false; _error = res['error']?.toString() ?? 'Signup failed'; });
        return;
      }

      // Request email OTP for verification
      final otpRes = await _api.requestOtp(
        identifier: _emailCtrl.text.trim(),
        purpose: 'signup',
      );
      if (otpRes['success'] == true) {
        setState(() {
          _otpId = otpRes['data']?['otpId']?.toString() ?? _emailCtrl.text.trim();
          _step = 1;
          _loading = false;
        });
      } else {
        setState(() { _loading = false; _error = 'Failed to send verification email'; });
      }
    } on DioException catch (e) {
      if (mounted) {
        final msg = e.response?.data?['error']?.toString() ?? 'Signup failed. Please try again.';
        setState(() { _loading = false; _error = msg; });
      }
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = 'Signup failed. Please try again.'; });
    }
  }

  Future<void> _verifyOtp() async {
    final code = _otpCtrl.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter 6-digit verification code');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await _api.verifyOtp(
        identifier: _otpId ?? _emailCtrl.text.trim(),
        code: code,
        purpose: 'signup',
      );
      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Account created! Please login.'),
              backgroundColor: Colors.green,
            ),
          );
          GoRouter.of(context).go('/login');
        }
      } else {
        setState(() { _loading = false; _error = 'Invalid verification code'; });
      }
    } on DioException catch (e) {
      if (mounted) {
        final msg = e.response?.data?['error']?.toString() ?? 'Verification failed';
        setState(() { _loading = false; _error = msg; });
      }
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = 'Verification failed. Try again.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: AppColors.vendor,
                ),
                child: const Center(
                  child: Text('V', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _step == 0 ? 'Create Vendor Account' : 'Verify Email',
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.text),
              ),
              const SizedBox(height: 6),
              Text(
                _step == 0
                    ? 'Register your business on VendorCenter'
                    : 'Enter the 6-digit code sent to ${_emailCtrl.text.trim()}',
                style: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 24),

              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13))),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              if (_step == 0) _buildForm(),
              if (_step == 1) _buildOtpStep(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Full Name *', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _nameCtrl,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(hintText: 'Your full name'),
        ),
        const SizedBox(height: 16),

        const Text('Email *', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(hintText: 'vendor@example.com'),
        ),
        const SizedBox(height: 16),

        const Text('Phone (optional)', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          decoration: const InputDecoration(
            prefixText: '+91 ',
            hintText: '10-digit number',
            counterText: '',
          ),
        ),
        const SizedBox(height: 16),

        const Text('Business Name (optional)', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _businessCtrl,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(hintText: 'Your business name'),
        ),
        const SizedBox(height: 16),

        const Text('Password *', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _passCtrl,
          obscureText: _obscurePass,
          decoration: InputDecoration(
            hintText: 'Min 8 chars, upper + lower + digit + special',
            suffixIcon: IconButton(
              icon: Icon(_obscurePass ? Icons.visibility_off : Icons.visibility, size: 20),
              onPressed: () => setState(() => _obscurePass = !_obscurePass),
            ),
          ),
        ),
        const SizedBox(height: 16),

        const Text('Confirm Password *', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _confirmPassCtrl,
          obscureText: _obscureConfirm,
          decoration: InputDecoration(
            hintText: 'Re-enter password',
            suffixIcon: IconButton(
              icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, size: 20),
              onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
            ),
          ),
        ),
        const SizedBox(height: 24),

        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _submitForm,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.vendor,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Create Account', style: TextStyle(fontSize: 16)),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton(
            onPressed: () => GoRouter.of(context).go('/login'),
            child: const Text('Already have an account? Login'),
          ),
        ),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _otpCtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          decoration: const InputDecoration(
            hintText: 'Enter 6-digit code',
            counterText: '',
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _verifyOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.vendor,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Verify & Complete', style: TextStyle(fontSize: 16)),
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => setState(() { _step = 0; _error = null; }),
          child: const Text('← Back to form'),
        ),
      ],
    );
  }
}
