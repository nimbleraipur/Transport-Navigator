import React, { useState } from "react";
import { reloadAppAsync } from "expo";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Text,
  Modal,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [reloading, setReloading] = useState(false);

  const handleRestart = async () => {
    setReloading(true);
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
    setReloading(false);
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View className="flex-1 w-full h-full justify-center items-center p-6 bg-background">
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          className="absolute right-4 w-11 h-11 rounded-xl items-center justify-center z-10 bg-surface border border-gray-100 shadow-sm"
          style={{ top: insets.top + 16 }}
        >
          <Feather name="alert-circle" size={20} color={Colors.text} />
        </Pressable>
      ) : null}

      <View className="items-center justify-center space-y-4 w-full max-w-md">
        <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-2">
          <Feather name="alert-triangle" size={40} color={Colors.danger} />
        </View>

        <Text className="text-2xl font-inter-bold text-text text-center leading-10">
          Something went wrong
        </Text>

        <Text className="text-base font-inter text-text-secondary text-center leading-6">
          An unexpected error occurred. Please reload the app to continue.
        </Text>

        <Pressable
          onPress={handleRestart}
          disabled={reloading}
          className={`w-full py-4 rounded-2xl items-center shadow-lg shadow-primary/20 bg-primary ${reloading ? 'opacity-70' : ''}`}
        >
          {reloading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-inter-bold text-surface">
              Try Again
            </Text>
          )}
        </Pressable>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="w-full h-[90%] rounded-t-3xl bg-surface">
              <View className="flex-row justify-between items-center px-4 pt-4 pb-3 border-b border-gray-100">
                <Text className="text-xl font-inter-semibold text-text">
                  Error Details
                </Text>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  className="w-11 h-11 items-center justify-center"
                >
                  <Feather name="x" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="w-full rounded-xl p-4 bg-gray-50 border border-gray-100">
                  <Text
                    style={{
                      color: Colors.text,
                      fontFamily: monoFont,
                    }}
                    className="text-xs leading-5"
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({});
