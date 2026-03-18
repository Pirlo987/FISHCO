import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export function useImagePicker() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  const handleAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    setImage(asset);
    if (asset.width && asset.height) setImageAspect(asset.width / asset.height);
  }, []);

  const pickImage = useCallback(async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission requise', "Acces a la phototheque necessaire.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!res.canceled) handleAsset(res.assets[0]);
  }, [handleAsset]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Acces a la camera necessaire.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
    });
    if (!res.canceled) handleAsset(res.assets[0]);
  }, [handleAsset]);

  const removeImage = useCallback(() => {
    setImage(null);
    setImageAspect(null);
  }, []);

  return { image, imageAspect, pickImage, takePhoto, removeImage } as const;
}
