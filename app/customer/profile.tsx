import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Animated, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';

function ProfileField({ label, value, icon, isLocked = false, onChangeText, placeholder }: any) {
  const safeValue = value ? String(value) : '';

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#999999', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>
        {label}
      </Text>
      <View style={{ 
        flexDirection: 'row', 
        paddingHorizontal: 16, 
        borderRadius: 16, 
        borderWidth: 1, 
        borderColor: '#F3F4F6', 
        backgroundColor: isLocked ? '#F9FAFB' : '#FFFFFF',
        height: 54,
        alignItems: 'center'
      }}>
        <View style={{ marginRight: 14 }}>
          <Ionicons name={icon} size={18} color={isLocked ? '#999999' : '#000000'} />
        </View>
        
        {isLocked ? (
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#666666' }}>
            {safeValue}
          </Text>
        ) : (
          <TextInput
            style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#000000' }}
            value={safeValue}
            onChangeText={(t) => onChangeText && onChangeText(t)}
            placeholder={placeholder}
            placeholderTextColor="rgba(0,0,0,0.2)"
            autoCorrect={false}
          />
        )}
        
        {isLocked && <Ionicons name="lock-closed" size={14} color="#999999" />}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  const uploadProfilePhoto = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;
      formData.append('photo', { uri, name: filename, type } as any);

      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/users/profile-photo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.user) {
        updateUser(data.user);
        Alert.alert('Success', 'Profile photo updated successfully.');
      } else {
        Alert.alert('Error', data.error || 'Failed to upload photo.');
      }
    } catch (e) {
      console.error('[PHOTO-UPLOAD-ERROR]', e);
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed. Please allow it in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking profile image:', e);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    setSaving(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/users/profile', baseUrl).toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.user) {
        updateUser(data.user);
        Alert.alert('Profile Updated', 'Your changes have been saved successfully');
      }
    } catch (e) {
      Alert.alert('Error', 'We could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Join Date N/A';

  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={['#000000', '#222222']}
        className="pb-12 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6 mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/10"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-white mr-10 uppercase tracking-widest">My Identity</Text>
        </View>

        <View className="items-center">
          <TouchableOpacity 
            onPress={pickImage}
            disabled={uploading}
            className="w-24 h-24 rounded-[32px] bg-white/10 items-center justify-center border border-white/20 shadow-2xl relative overflow-hidden"
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : user?.profileSelfie ? (
              <Image source={{ uri: user.profileSelfie }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={44} color="#FFFFFF" />
            )}
            <View className="absolute bottom-0 w-full bg-black/40 py-1 items-center">
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text className="text-xl font-inter-bold text-white mt-5">{user?.name || 'User'}</Text>
          <View className="bg-white/10 px-3 py-1 rounded-full mt-2 border border-white/20">
            <Text className="text-[9px] font-inter-bold text-white uppercase tracking-widest">Premium Member</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        className="flex-1 -mt-8"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottomInset + 30 }}
        style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-[40px] p-8 shadow-2xl shadow-black/5 border border-gray-100">
          <ProfileField
            label="Full Name"
            value={name}
            onChangeText={setName}
            icon="person-outline"
            placeholder="Ex. John Doe"
          />

          <ProfileField
            label="Registered Mobile"
            value={user?.phone || ''}
            icon="call-outline"
            isLocked={true}
          />

          <ProfileField
            label="Account Identity"
            value="Standard Customer"
            icon="medal-outline"
            isLocked={true}
          />

          <View className="mt-2 p-5 bg-gray-50 rounded-[24px] border border-gray-100 items-center flex-row">
            <View className="w-10 h-10 rounded-xl bg-black items-center justify-center mr-4">
              <MaterialIcons name="event-available" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[9px] font-inter-bold text-gray-400 uppercase tracking-[2px]">Member Journey</Text>
              <Text className="text-sm font-inter-bold text-black mt-0.5">{memberSince}</Text>
            </View>
          </View>

          <TouchableOpacity
            className="mt-8 h-16 rounded-[24px] bg-black items-center justify-center flex-row shadow-xl shadow-black/20"
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-sm font-inter-bold text-white mr-3 uppercase tracking-widest">Sync Profile</Text>
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-10 px-6 items-center">
          <Text className="text-[11px] font-inter-medium text-gray-400 text-center leading-5 opacity-60">
            Security lock active. Mobile identity changes require administrator intervention.
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
