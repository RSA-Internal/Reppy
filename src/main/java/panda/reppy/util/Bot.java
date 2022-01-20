package panda.reppy.util;

import com.sun.org.apache.bcel.internal.Const;
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.Activity;
import net.dv8tion.jda.api.interactions.commands.build.CommandData;
import net.dv8tion.jda.api.requests.GatewayIntent;
import net.dv8tion.jda.api.utils.ChunkingFilter;
import net.dv8tion.jda.api.utils.MemberCachePolicy;
import net.dv8tion.jda.api.utils.cache.CacheFlag;
import panda.reppy.commands.BaseCommand;
import panda.reppy.commands.slashcommands.Ping;
import panda.reppy.commands.slashcommands.PostQuestion;
import panda.reppy.commands.slashcommands.Stop;
import panda.reppy.entities.MessageWaiter;
import panda.reppy.listeners.MessageListener;
import panda.reppy.listeners.SlashCommandListener;
import panda.reppy.util.constants.SnowflakeConstants;

import javax.security.auth.login.LoginException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static panda.reppy.listeners.SlashCommandListener.getCommandMap;

public class Bot {

    public Bot(final String token) throws LoginException, InterruptedException {
        JDABuilder builder = JDABuilder.createDefault(token);

        addListeners(builder);
        configureMemoryUsage(builder);

        JDA jda = builder.build();
        jda.awaitReady();

        Map<String, BaseCommand> loadedCommands = getCommandMap();

        jda.getGuildById(SnowflakeConstants.HOME_GUILD_ID)
                .updateCommands().addCommands(loadedCommands.values()).queue();
    }

    private static void addListeners(JDABuilder builder) {
        SlashCommandListener slashCommandListener = new SlashCommandListener();
        initSlashCommands(slashCommandListener);

        builder.addEventListeners(new MessageListener(), slashCommandListener, new MessageWaiter());
    }

    private static void configureMemoryUsage(JDABuilder builder) {
        // Enable the bulk delete event.
        builder.setBulkDeleteSplittingEnabled(false);

        // Disable All CacheFlags.
        builder.disableCache(Arrays.asList(CacheFlag.values()));

        // Only cache members who are online or owner of the guild.
        builder.setMemberCachePolicy(MemberCachePolicy.ONLINE.or(MemberCachePolicy.OWNER));

        // Disable member chunking on startup.
        builder.setChunkingFilter(ChunkingFilter.NONE);

        // Disable All intents
        builder.disableIntents(Arrays.asList(GatewayIntent.values()));

        // Enable specific intents.
        builder.enableIntents(GatewayIntent.DIRECT_MESSAGES, GatewayIntent.GUILD_MESSAGES);

        // Consider guilds with more than 50 members as "large".
        // Large guilds will only provide online members in the setup and thus reduce
        // bandwidth if chunking is disabled.
        builder.setLargeThreshold(50);

        // Set Activity to display the version.
        builder.setActivity(Activity.playing("v0.1.0_alpha"));
    }

    private static void initSlashCommands(SlashCommandListener listener) {
        // Member Specific Commands
        listener.initCommands(new Ping(), new PostQuestion());

        // Admin Specific Commands

        // Owner Specific Commands
        listener.initCommands(new Stop());
    }
}
