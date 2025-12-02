import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Linking,
  Image,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Developer images - local requires
const developerImages = {
  rudra: require('../../assets/developers/rudra.png'),
  onkar: require('../../assets/developers/onkar.png'),
  priyanshu: require('../../assets/developers/priyanshu.png'),
  yami: require('../../assets/developers/yami.png'),
  aanya: require('../../assets/developers/aanya.png'),
};

// Developer data
const developers = [
  {
    id: 1,
    name: 'Rudra Khambhayata',
    role: 'Lead Developer',
    bio: 'Passionate about mobile development and clean architecture.',
    location: 'IIIT Naya Raipur',
    avatar: developerImages.rudra,
    instagram: 'https://www.instagram.com/rudra_kh36?igsh=aWp2M2p2ZzEwYTJj',
    github: 'https://github.com/Rudra-kh',
    linkedin: 'https://www.linkedin.com/in/rudra-khambhayata-7414aa373/',
    email: 'khambhayata25100@iiitnr.edu.in',
  },
  {
    id: 2,
    name: 'Onkar Kokate',
    role: 'Full Stack Developer',
    bio: 'Building seamless experiences with React Native and Firebase.',
    location: 'IIIT Naya Raipur',
    avatar: developerImages.onkar,
    instagram: 'https://www.instagram.com/onkarr_28?utm_source=qr&igsh=MTVsenNkb2c1OXEzMA==',
    github: 'https://github.com/onkarr28',
    linkedin: null,
    email: 'kokate25100@iiitnr.edu.in',
  },
  {
    id: 3,
    name: 'Priyanshu Sodhan',
    role: 'Backend Developer',
    bio: 'Building scalable systems with Firebase and Node.js.',
    location: 'IIIT Naya Raipur',
    avatar: developerImages.priyanshu,
    instagram: 'https://www.instagram.com/priyanshu_sodhan?igsh=MW0wdGc3emZtYmIzbQ==',
    github: 'https://github.com/priyanshusodhan',
    linkedin: 'https://www.linkedin.com/in/priyanshu-sodhan-5b125b29a/',
    email: 'priyanshu25100@iiitnr.edu.in',
  },
  {
    id: 4,
    name: 'Yami Sindram',
    role: 'UI/UX Designer',
    bio: 'Creating beautiful and intuitive user experiences.',
    location: 'IIIT Naya Raipur',
    avatar: developerImages.yami,
    instagram: 'https://www.instagram.com/ssupyami?igsh=MXdibzh3c2thY3g4OA==',
    github: 'https://github.com/Yamisindram1595',
    linkedin: null,
    email: 'yami25100@iiitnr.edu.in',
  },
  {
    id: 5,
    name: 'Aanya Chandrakar',
    role: 'QA & Testing Lead',
    bio: 'Ensuring quality through rigorous testing and automation.',
    location: 'IIIT Naya Raipur',
    avatar: developerImages.aanya,
    instagram: 'https://www.instagram.com/aanya_1511_?igsh=NmZlcmtma3ZkZnky',
    github: 'https://github.com/aanyacloud',
    linkedin: null,
    email: 'aanya25100@iiitnr.edu.in',
  },
];

const ITEM_SIZE = 120;
const ITEM_SPACING = 10;
const CYLINDER_RADIUS = 180;
const LOOP_CLONES = 3; // Number of times to repeat data for infinite effect

export default function AboutDevelopersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  
  // Create looped data - repeat the array multiple times
  const loopedData = [...developers, ...developers, ...developers];
  const initialScrollIndex = developers.length; // Start at the middle copy
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const infoFade = useRef(new Animated.Value(1)).current;
  const infoSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Scroll to middle section on mount
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: initialScrollIndex,
        animated: false,
      });
    }, 100);
  }, []);

  // Animate info card when active index changes
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(infoFade, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(infoSlide, {
          toValue: 20,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(infoFade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(infoSlide, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [activeIndex]);

  const handleScrollEnd = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (ITEM_SIZE + ITEM_SPACING));
    
    // If we scroll too far left or right, jump back to middle section
    if (index < developers.length / 2) {
      // Near the beginning, jump to middle
      flatListRef.current?.scrollToIndex({
        index: index + developers.length,
        animated: false,
      });
    } else if (index >= developers.length * 2 + developers.length / 2) {
      // Near the end, jump back to middle
      flatListRef.current?.scrollToIndex({
        index: index - developers.length,
        animated: false,
      });
    }
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const x = event.nativeEvent.contentOffset.x;
        const index = Math.round(x / (ITEM_SIZE + ITEM_SPACING));
        const realIndex = index % developers.length;
        if (realIndex !== activeIndex && realIndex >= 0) {
          setActiveIndex(realIndex);
        }
      }
    }
  );

  const activeDeveloper = developers[activeIndex];

  const openLink = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 2) * (ITEM_SIZE + ITEM_SPACING),
      (index - 1) * (ITEM_SIZE + ITEM_SPACING),
      index * (ITEM_SIZE + ITEM_SPACING),
      (index + 1) * (ITEM_SIZE + ITEM_SPACING),
      (index + 2) * (ITEM_SIZE + ITEM_SPACING),
    ];

    // 3D Cylinder effect - rotation around Y axis
    const rotateY = scrollX.interpolate({
      inputRange,
      outputRange: ['70deg', '35deg', '0deg', '-35deg', '-70deg'],
      extrapolate: 'clamp',
    });

    // Scale - center item is largest
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 0.8, 1.1, 0.8, 0.6],
      extrapolate: 'clamp',
    });

    // Translate Z effect (using translateY for depth illusion)
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 10, -20, 10, 30],
      extrapolate: 'clamp',
    });

    // Translate X for circular arc positioning
    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [-30, -15, 0, 15, 30],
      extrapolate: 'clamp',
    });

    // Opacity - fade edges
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 0.7, 1, 0.7, 0.4],
      extrapolate: 'clamp',
    });

    const realIndex = index % developers.length;
    const isActive = realIndex === activeIndex;

    return (
      <Animated.View
        style={[
          styles.itemContainer,
          {
            opacity,
            transform: [
              { perspective: 800 },
              { translateX },
              { translateY },
              { rotateY },
              { scale },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.avatarWrapper,
            isActive && styles.avatarWrapperActive,
          ]}
        >
          <Image
            source={item.avatar}
            style={styles.avatar}
          />
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a365d', '#234e70', '#2d5a7b']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Developers</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* 3D Carousel */}
      <Animated.View
        style={[
          styles.carouselContainer,
          { opacity: fadeAnim },
        ]}
      >
        <Animated.FlatList
          ref={flatListRef}
          data={loopedData}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          snapToInterval={ITEM_SIZE + ITEM_SPACING}
          decelerationRate="fast"
          onScroll={onScroll}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          renderItem={renderItem}
          getItemLayout={(data, index) => ({
            length: ITEM_SIZE + ITEM_SPACING,
            offset: (ITEM_SIZE + ITEM_SPACING) * index,
            index,
          })}
          initialScrollIndex={initialScrollIndex}
        />
      </Animated.View>

      {/* Info Card */}
      <Animated.View
        style={[
          styles.infoCard,
          {
            opacity: infoFade,
            transform: [{ translateY: infoSlide }],
          },
        ]}
      >
        <View style={styles.cardInner}>
          <Text style={styles.developerName}>{activeDeveloper.name}</Text>
          <Text style={styles.developerRole}>{activeDeveloper.role}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.developerBio}>{activeDeveloper.bio}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
            <Text style={styles.developerLocation}>{activeDeveloper.location}</Text>
          </View>
          
          {/* Social Links */}
          <View style={styles.socialLinks}>
            {activeDeveloper.instagram && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openLink(activeDeveloper.instagram)}
              >
                <MaterialCommunityIcons name="instagram" size={26} color="#E1306C" />
              </TouchableOpacity>
            )}
            {activeDeveloper.github && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openLink(activeDeveloper.github)}
              >
                <MaterialCommunityIcons name="github" size={26} color="#333" />
              </TouchableOpacity>
            )}
            {activeDeveloper.linkedin && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openLink(activeDeveloper.linkedin)}
              >
                <MaterialCommunityIcons name="linkedin" size={26} color="#0A66C2" />
              </TouchableOpacity>
            )}
            {activeDeveloper.email && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openLink(`mailto:${activeDeveloper.email}`)}
              >
                <MaterialCommunityIcons name="email" size={26} color="#EA4335" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Pagination Dots */}
      <View style={[styles.pagination, { bottom: insets.bottom + 30 }]}>
        {developers.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Swipe Hint */}
      <Animated.View
        style={[
          styles.swipeHint,
          { opacity: fadeAnim, bottom: insets.bottom + 10 },
        ]}
      >
        <MaterialCommunityIcons name="gesture-swipe-horizontal" size={20} color="rgba(255,255,255,0.5)" />
        <Text style={styles.swipeHintText}>Swipe to explore</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  carouselContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    paddingHorizontal: (SCREEN_WIDTH - ITEM_SIZE) / 2,
    alignItems: 'center',
  },
  itemContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE + 40,
    marginHorizontal: ITEM_SPACING / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    backgroundColor: '#F7E8D0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(45, 55, 72, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  avatarWrapperActive: {
    borderWidth: 4,
    borderColor: '#F7E8D0',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  avatar: {
    width: ITEM_SIZE - 6,
    height: ITEM_SIZE - 6,
    borderRadius: (ITEM_SIZE - 6) / 2,
    backgroundColor: '#F7E8D0',
  },
  infoCard: {
    flex: 1,
    marginHorizontal: 24,
    marginTop: 10,
    maxHeight: 280,
  },
  cardInner: {
    backgroundColor: '#FFF9F0',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  developerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2D3748',
    textAlign: 'center',
  },
  developerRole: {
    fontSize: 15,
    color: '#4A5568',
    marginTop: 4,
    fontStyle: 'italic',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
    borderRadius: 1,
  },
  developerBio: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  developerLocation: {
    fontSize: 13,
    color: '#718096',
  },
  socialLinks: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pagination: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    right: 0,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  swipeHint: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    right: 0,
    gap: 6,
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
